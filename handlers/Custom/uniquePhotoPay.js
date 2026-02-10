/**
 * Обработчик платежа за уникальное фото
 * Создает платеж в Юкассе на 10 рублей
 */

import { YookassaService } from '../../services/yookassa.js';
import { OrderService } from '../../services/order.js';

export async function handleUniquePhotoPay(env, telegramId, chatId, botToken) {
  try {
    console.log(`Initiating unique photo payment for user ${telegramId}`);

    // 1. Создаем заказ в базе
    const orderService = new OrderService(env.DB);
    const order = await orderService.createOrder(telegramId, 'custom_unique');

    if (!order || !order.id) {
      throw new Error('Failed to create order');
    }

    const orderId = order.id;
    console.log(`Order created: ${orderId}`);

    // 2. Инициализируем Юкассу
    const yookassa = new YookassaService(
      env.YOOKASSA_SHOP_ID,
      env.YOOKASSA_SECRET_KEY
    );

    // 3. Подготавливаем метаданные для платежа
    const metadata = {
      telegramId: telegramId,
      chatId: chatId,
      orderId: orderId,
      packId: 'custom_unique',
      bot: 'aiphotobooth',
      email: env.MAIL // Добавляем email из констант
    };

    // 4. Создаем платеж на 10 рублей (1000 копеек)
    const paymentResponse = await yookassa.createPayment(
      1000, // 10 рублей в копейках
      '🎨 Уникальное фото с AI',
      'https://t.me/Magical_photo_booth_bot',
      metadata,
      env.MAIL // Email для чека
    );

    if (!paymentResponse.confirmation || !paymentResponse.confirmation.confirmation_url) {
      throw new Error('No confirmation URL from Yookassa');
    }

    const confirmationUrl = paymentResponse.confirmation.confirmation_url;
    console.log(`Payment created: ${paymentResponse.id}`);

    // 5. Отправляем пользователю ссылку на оплату
    await sendPaymentLink(
      botToken,
      chatId,
      confirmationUrl
    );

  } catch (error) {
    console.error('Error creating unique photo payment:', error);
    
    // Уведомляем об ошибке
    await sendTelegramMessage(
      botToken,
      chatId,
      `❌ Не удалось создать платеж. Попробуйте снова.\n\nОшибка: ${error.message}`
    );
  }
}

/**
 * Отправляет пользователю ссылку на оплату
 */
async function sendPaymentLink(botToken, chatId, confirmationUrl) {
  const message = `💳 Уникальное фото с AI\n\n📊 Сумма: <b>10 ₽</b>\n\nНажмите кнопку ниже для оплаты:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💰 Оплатить 10 ₽', url: confirmationUrl }],
      [{ text: '❌ Отмена', callback_data: 'back_to_menu' }]
    ]
  };

  await sendTelegramMessage(botToken, chatId, message, keyboard);
}

/**
 * Отправляет сообщение в Telegram
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
    console.error('Telegram error:', error);
    throw new Error(`Telegram error: ${error.description}`);
  }
}
