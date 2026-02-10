/**
 * Хелпер для инициирования платежа
 * Вызывается когда пользователь выбирает определенную услугу
 * 
 * Функция:
 * 1. Создает заказ в D1
 * 2. Создает платеж в Юкассе
 * 3. Отправляет пользователю ссылку для оплаты
 */

import { YookassaService, getPaymentDetails } from '../services/yookassa.js';
import { OrderService } from '../services/order.js';

/**
 * Инициирует платеж для покупки услуги
 * @param {object} env - Окружение (БД, токены и т.д.)
 * @param {number} telegramId - ID пользователя в Telegram
 * @param {number} chatId - ID чата
 * @param {string} paymentType - Тип услуги (session_pregnancy, ready_photo и т.д.)
 * @param {string} botToken - Токен Telegram бота
 * @param {string} returnUrl - URL для возврата после платежа
 * @returns {Promise<void>}
 */
export async function initiatePayment(
  env,
  telegramId,
  chatId,
  paymentType,
  botToken,
  returnUrl = 'https://pay.ai-mommy.ru/return'
) {
  try {
    // 1. Валидируем входные данные
    if (!telegramId || !chatId || !paymentType) {
      throw new Error('Missing required parameters for payment initiation');
    }

    // 2. Получаем детали платежа (сумму, описание)
    const paymentDetails = getPaymentDetails(paymentType);
    console.log(`Initiating payment for ${paymentType}:`, paymentDetails);

    // 3. Создаем заказ в базе
    const orderService = new OrderService(env.DB);
    const order = await orderService.createOrder(telegramId, paymentType);

    if (!order || !order.id) {
      throw new Error('Failed to create order in database');
    }

    const orderId = order.id;
    console.log(`Order created: ${orderId}`);

    // 4. Инициализируем сервис Юкассы
    const yookassa = new YookassaService(
      env.YOOKASSA_SHOP_ID,
      env.YOOKASSA_SECRET_KEY
    );

    // 5.준备 метаданные для платежа
    // Эти данные будут переданы обратно в webhook уведомлении
    const metadata = {
      telegramId: telegramId,
      chatId: chatId,
      orderId: orderId,
      packId: paymentType,
      bot: 'aiphotobooth'
    };

    // 6. Создаем платеж в Юкассе
    const paymentResponse = await yookassa.createPayment(
      paymentDetails.amount,
      paymentDetails.description,
      returnUrl,
      metadata
    );

    if (!paymentResponse.confirmation || !paymentResponse.confirmation.confirmation_url) {
      throw new Error('No confirmation URL received from Yookassa');
    }

    const confirmationUrl = paymentResponse.confirmation.confirmation_url;
    const yookassaPaymentId = paymentResponse.id;

    console.log(`Payment created in Yookassa: ${yookassaPaymentId}`);

    // 7. Отправляем пользователю ссылку на оплату в Telegram
    await sendPaymentLink(
      botToken,
      chatId,
      paymentDetails.description,
      paymentDetails.amount,
      confirmationUrl
    );

  } catch (error) {
    console.error('Error initiating payment:', error);

    // Уведомляем пользователя об ошибке
    try {
      await sendTelegramMessage(
        botToken,
        chatId,
        `❌ Не удалось создать платеж. Пожалуйста, попробуйте снова.\n\nОшибка: ${error.message}`
      );
    } catch (e) {
      console.error('Could not send error message:', e);
    }

    throw error;
  }
}

/**
 * Отправляет пользователю ссылку для оплаты
 * @param {string} botToken - Токен бота
 * @param {number} chatId - ID чата
 * @param {string} description - Описание услуги
 * @param {number} amountInKopecks - Сумма в копейках
 * @param {string} confirmationUrl - URL для оплаты от Юкассы
 */
async function sendPaymentLink(botToken, chatId, description, amountInKopecks, confirmationUrl) {
  const amountInRubles = (amountInKopecks / 100).toFixed(2);

  const message = `💳 ${description}\n\n📊 Сумма: <b>${amountInRubles} ₽</b>\n\nНажмите кнопку ниже чтобы оплатить:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💰 Оплатить', url: confirmationUrl }],
      [{ text: '❌ Отмена', callback_data: 'back_to_menu' }]
    ]
  };

  await sendTelegramMessage(botToken, chatId, message, keyboard);
}

/**
 * Отправляет сообщение в Telegram
 * @param {string} botToken - Токен бота
 * @param {number} chatId - ID чата
 * @param {string} text - Текст сообщения
 * @param {object} replyMarkup - Клавиатура (опционально)
 */
async function sendTelegramMessage(botToken, chatId, text, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Telegram API error:', error);
    throw new Error(`Telegram error: ${error.description}`);
  }
}
