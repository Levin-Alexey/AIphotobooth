/**
 * ПРИМЕР: Consumer для обработки заказов из Queue
 * 
 * Этот код будет выполняться как Durable Object или Consumer worker,
 * и обрабатывать заказы которые были поставлены в Queue после оплаты.
 * 
 * В будущем сюда интегрируется логика:
 * - Генерирование фото (FLUX, Midjourney и т.д.)
 * - Обработка фото (фильтры, эффекты)
 * - Загрузка результата в R2
 * - Отправка ссылки пользователю в Telegram
 */

import { OrderService } from './order.js';
import { processUniquePhoto } from './uniquePhotoProcessor.js';

/**
 * Обработчик сообщения из Queue
 */
export async function processQueueMessage(message, env) {
  try {
    const { type } = message;

    // Обработка уникального фото через OpenRouter
    if (type === 'process_unique_photo') {
      await processUniquePhoto(env, message);
      return;
    }

    // Обработка стандартных заказов
    if (type !== 'process_order') {
      console.log('Unknown message type:', type);
      return;
    }

    const { orderId, telegramId, chatId, packId, paymentId } = message;
    console.log(`Processing order ${orderId} for user ${telegramId}`);

    const orderService = new OrderService(env.DB);

    // 1. Обновляем статус заказа на 'processing'
    await orderService.markOrderAsProcessing(orderId);
    await sendTelegramNotification(
      env.BOT_TOKEN,
      chatId,
      '⏳ Ваш заказ начал обрабатываться. Это займет некоторое время...'
    );

    // 2. В зависимости от типа услуги вызываем нужную функцию
    switch (packId) {
      case 'session_pregnancy':
      case 'session_newborn':
      case 'session_monthly':
      case 'session_seasonal':
      case 'session_family':
      case 'session_home':
      case 'session_portrait':
        await processPhotoSession(
          env,
          orderId,
          chatId,
          packId
        );
        break;

      case 'ready_photo':
        await processReadyPhoto(
          env,
          orderId,
          chatId
        );
        break;

      case 'custom_edit':
        await processCustomEdit(
          env,
          orderId,
          chatId
        );
        break;

      default:
        throw new Error(`Unknown pack type: ${packId}`);
    }

  } catch (error) {
    console.error('Error processing queue message:', error);
    // Здесь можно добавить повторные попытки или уведомление об ошибке
  }
}

/**
 * ============================================
 * ЗАГЛУШКИ ДЛЯ БУДУЩЕЙ ОБРАБОТКИ
 * ============================================
 */

/**
 * Обработка фотосессии (7 типов)
 * 
 * Здесь будет:
 * 1. Получение исходных данных пользователя
 * 2. Вызов AI модели для обработки
 * 3. Загрузка результата в R2
 * 4. Сохранение ссылки в БД
 * 5. Отправка результата пользователю
 */
async function processPhotoSession(env, orderId, chatId, sessionType) {
  console.log(`Processing photo session: ${sessionType}`);
  
  const orderService = new OrderService(env.DB);
  const order = await orderService.getOrder(orderId);
  
  // TODO: Реализовать логику обработки
  // 1. Получить исходные фото из input_photos
  // 2. Передать в AI с инструкциями для каждого типа сессии
  // 3. Сохранить результат
  
  // Заглушка результата:
  const resultPhotos = [
    'https://example.com/result/1.jpg',
    'https://example.com/result/2.jpg'
  ];

  // Обновляем заказ на completed
  await orderService.markOrderAsCompleted(orderId, JSON.stringify(resultPhotos));

  // Отправляем результат пользователю
  await sendTelegramNotification(
    env.BOT_TOKEN,
    chatId,
    `✅ Обработка завершена!\n\n📸 Ваши фото готовы:\n${resultPhotos.map((url, i) => `${i + 1}. [Фото ${i + 1}](${url})`).join('\n')}`
  );
}

/**
 * Обработка готового фото
 * 
 * Здесь будет:
 * 1. Получение фото от пользователя
 * 2. Применение выбранного стиля из фотосессии
 * 3. Загрузка результата в R2
 * 4. Отправка результата
 */
async function processReadyPhoto(env, orderId, chatId) {
  console.log(`Processing ready photo for order ${orderId}`);
  
  const orderService = new OrderService(env.DB);
  const order = await orderService.getOrder(orderId);
  
  // TODO: Реализовать логику обработки готового фото
  // 1. Получить фото из input_photos (загруженное пользователем)
  // 2. Применить эффекты/стиль
  // 3. Сохранить результат
  
  const resultPhotos = [
    'https://example.com/processed/photo.jpg'
  ];

  await orderService.markOrderAsCompleted(orderId, JSON.stringify(resultPhotos));

  await sendTelegramNotification(
    env.BOT_TOKEN,
    chatId,
    `✅ Фото обработано!\n\n📸 Результат: ${resultPhotos[0]}`
  );
}

/**
 * Генерация фото по описанию
 * 
 * Здесь будет:
 * 1. Получение текстового промпта от пользователя
 * 2. Вызов FLUX или другой AI модели
 * 3. Загрузка результата в R2
 * 4. Отправка результата
 */
async function processCustomEdit(env, orderId, chatId) {
  console.log(`Processing custom edit for order ${orderId}`);
  
  const orderService = new OrderService(env.DB);
  const order = await orderService.getOrder(orderId);
  
  // TODO: Реализовать логику генерации
  // 1. Получить промпт из input_photos (это будет текст, сохраненный как JSON)
  // 2. Вызвать FLUX API с промптом
  // 3. Сохранить результат в R2
  // 4. Обновить БД с результатом
  
  const resultPhotos = [
    'https://example.com/generated/image.jpg'
  ];

  await orderService.markOrderAsCompleted(orderId, JSON.stringify(resultPhotos));

  await sendTelegramNotification(
    env.BOT_TOKEN,
    chatId,
    `✅ Фото сгенерировано!\n\n🎨 Ваше творение: ${resultPhotos[0]}`
  );
}

/**
 * Отправка уведомления в Telegram
 */
async function sendTelegramNotification(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram error:', error);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
