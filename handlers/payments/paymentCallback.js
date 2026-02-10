/**
 * Обработчик webhook платежей от Юкассы
 * URL: https://pay.ai-mommy.ru/payment-callback
 * 
 * Этот обработчик:
 * 1. Получает уведомление от Юкассы о статусе платежа
 * 2. Проверяет что платеж прошел успешно
 * 3. Обновляет статус заказа в базе на 'paid'
 * 4. Отправляет подтверждение пользователю в Telegram
 * 5. Ставит заказ в очередь на обработку
 */

import { YookassaService } from '../../services/yookassa.js';
import { OrderService, PaymentService } from '../../services/order.js';

export async function handlePaymentCallback(request, env, BOT_TOKEN) {
  try {
    // 1. Парсим тело запроса
    const notification = await request.json();
    console.log('Webhook received:', notification.event);

    // 2. Проверяем что это уведомление именно от Юкассы (проверка события)
    if (!notification.event || !notification.object) {
      return new Response(
        JSON.stringify({ error: 'Invalid notification format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Обрабатываем только успешные платежи
    if (notification.event === 'payment.succeeded') {
      const payment = notification.object;
      const paymentId = payment.id;
      const amount = parseInt(payment.amount.value) * 100; // Конвертируем в копейки
      const metadata = payment.metadata || {};

      console.log(`Processing successful payment: ${paymentId}`);
      console.log('Payment metadata:', metadata);

      // 4. Получаем данные из метаданных платежа
      const telegramId = metadata.telegramId;
      const chatId = metadata.chatId;
      const orderId = metadata.orderId;
      const packId = metadata.packId;

      // 5. Валидируем что все необходимые данные есть
      if (!telegramId || !chatId || !orderId || !packId) {
        console.error('Missing required metadata in payment:', metadata);
        return new Response(
          JSON.stringify({ error: 'Invalid payment metadata' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 6. Инициализируем сервисы
      const orderService = new OrderService(env.DB);
      const paymentService = new PaymentService(env.DB);

      try {
        // 7. Записываем платеж в базу
        await paymentService.recordPayment(orderId, paymentId, amount);

        // 8. Обновляем статус заказа на 'paid'
        await orderService.markOrderAsPaid(orderId, paymentId);

        // 9. Отправляем подтверждение пользователю в Telegram
        // Для custom_unique отправляем запрос промпта
        if (packId === 'custom_unique') {
          await sendTelegramNotification(
            BOT_TOKEN,
            chatId,
            `✅ Оплата прошла успешно!\n\nНапишите, как нужно обработать фото.\nОпишите подробно, что вы хотите видеть на фотографии.`
          );
          // Сохраняем в KV что ждем промпт от этого пользователя
          if (env.KV) {
            await env.KV.put(`awaiting_prompt_${telegramId}`, JSON.stringify({
              orderId: orderId,
              chatId: chatId,
              stage: 'prompt',
              timestamp: Date.now()
            }), { expirationTtl: 3600 }); // 1 час
          }
        } else {
          // Для остальных типов - стандартное сообщение
          await sendTelegramNotification(
            BOT_TOKEN,
            chatId,
            `✅ Оплата прошла успешно!\n\nНомер заказа: #${orderId}\nСумма: ${(amount / 100).toFixed(2)} ₽\n\nОбработка начнется в ближайшее время...`
          );
        }

        // 10. Ставим заказ в очередь на обработку
        if (env.Queue) {
          await env.Queue.send({
            type: 'process_order',
            orderId: orderId,
            telegramId: telegramId,
            chatId: chatId,
            packId: packId,
            paymentId: paymentId,
            timestamp: Date.now()
          });
          console.log(`Order ${orderId} queued for processing`);
        }

        // 11. Возвращаем успешный ответ
        return new Response(
          JSON.stringify({ success: true, paymentId: paymentId }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (dbError) {
        console.error('Database error processing payment:', dbError);
        
        // Даже если ошибка в базе, уведомляем пользователя
        try {
          await sendTelegramNotification(
            BOT_TOKEN,
            chatId,
            `⚠️ Платеж получен, но произошла ошибка обработки.\nНаш тим уже разбирается! Номер заказа: #${orderId}`
          );
        } catch (e) {
          console.error('Could not send error notification:', e);
        }

        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 12. Обрабатываем отмену платежа
    if (notification.event === 'payment.canceled') {
      const payment = notification.object;
      const metadata = payment.metadata || {};
      const chatId = metadata.chatId;

      console.log(`Payment canceled: ${payment.id}`);

      if (chatId) {
        await sendTelegramNotification(
          BOT_TOKEN,
          chatId,
          `❌ Платеж отменен.\n\nЕсли это произошло по ошибке, попробуйте заново.`
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 13. Для всех остальных событий возвращаем OK
    return new Response(
      JSON.stringify({ success: true, event: notification.event }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Отправляет уведомление пользователю в Telegram
 * @param {string} token - Токен бота
 * @param {number} chatId - ID чата
 * @param {string} text - Текст сообщения
 */
async function sendTelegramNotification(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram API error:', error);
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}
