/**
 * Обработчик для получения промпта и фото от пользователя
 * после оплаты custom_unique
 */

import { OrderService } from '../../services/order.js';

/**
 * Обрабатывает текстовое сообщение (промпт)
 */
export async function handleUniquePhotoPrompt(env, telegramId, chatId, text, botToken) {
  try {
    // Проверяем ожидаем ли мы промпт от этого пользователя
    const stateKey = `awaiting_prompt_${telegramId}`;
    const stateData = await env.KV.get(stateKey);
    
    if (!stateData) {
      return false; // Не ждем промпт от этого пользователя
    }

    const state = JSON.parse(stateData);
    const orderId = state.orderId;

    console.log(`Received prompt for order ${orderId}: ${text}`);

    // Сохраняем промпт в заказе
    const orderService = new OrderService(env.DB);
    const order = await orderService.getOrder(orderId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Сохраняем промпт в input_photos как JSON
    await env.DB
      .prepare('UPDATE Orders SET input_photos = ?, updated_at = ? WHERE id = ?')
      .bind(
        JSON.stringify({ prompt: text }), 
        Math.floor(Date.now() / 1000),
        orderId
      )
      .run();

    // Обновляем состояние - теперь ждем фото
    await env.KV.put(`awaiting_photo_${telegramId}`, JSON.stringify({
      orderId: orderId,
      chatId: chatId,
      prompt: text,
      stage: 'photo',
      timestamp: Date.now()
    }), { expirationTtl: 3600 });

    // Удаляем старое состояние
    await env.KV.delete(stateKey);

    // Просим пользователя отправить фото
    await sendTelegramMessage(
      botToken,
      chatId,
      '📸 Отлично! Теперь отправьте фото для обработки.'
    );

    return true;
  } catch (error) {
    console.error('Error handling unique photo prompt:', error);
    return false;
  }
}

/**
 * Обрабатывает фото от пользователя
 */
export async function handleUniquePhotoUpload(env, telegramId, chatId, photo, botToken) {
  try {
    // Проверяем ожидаем ли мы фото от этого пользователя
    const stateKey = `awaiting_photo_${telegramId}`;
    const stateData = await env.KV.get(stateKey);
    
    if (!stateData) {
      return false; // Не ждем фото от этого пользователя
    }

    const state = JSON.parse(stateData);
    const orderId = state.orderId;
    const prompt = state.prompt;

    console.log(`Received photo for order ${orderId}`);

    // Получаем file_id самого большого фото
    const photoSizes = photo;
    const largestPhoto = photoSizes[photoSizes.length - 1];
    const fileId = largestPhoto.file_id;

    // Получаем информацию о файле
    const fileInfo = await getFileInfo(botToken, fileId);
    if (!fileInfo.ok) {
      throw new Error('Failed to get file info');
    }

    const filePath = fileInfo.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    // Скачиваем фото
    const photoResponse = await fetch(fileUrl);
    if (!photoResponse.ok) {
      throw new Error('Failed to download photo');
    }

    const photoBuffer = await photoResponse.arrayBuffer();

    // Сохраняем в R2
    const r2Key = `input/${orderId}/${Date.now()}.jpg`;
    await env.BUCKET.put(r2Key, photoBuffer, {
      httpMetadata: {
        contentType: 'image/jpeg'
      }
    });

    console.log(`Photo saved to R2: ${r2Key}`);

    // Обновляем заказ с путем к фото в R2
    const orderService = new OrderService(env.DB);
    const order = await orderService.getOrder(orderId);
    const inputData = JSON.parse(order.input_photos || '{}');
    inputData.photoUrl = `r2://${r2Key}`;

    await env.DB
      .prepare('UPDATE Orders SET input_photos = ?, updated_at = ? WHERE id = ?')
      .bind(
        JSON.stringify(inputData),
        Math.floor(Date.now() / 1000),
        orderId
      )
      .run();

    // Ставим в очередь на обработку
    if (env.Queue) {
      await env.Queue.send({
        type: 'process_unique_photo',
        orderId: orderId,
        telegramId: telegramId,
        chatId: chatId,
        prompt: prompt,
        photoUrl: r2Key,
        timestamp: Date.now()
      });
      console.log(`Order ${orderId} queued for unique photo processing`);
    }

    // Удаляем состояние
    await env.KV.delete(stateKey);

    // Уведомляем пользователя
    await sendTelegramMessage(
      botToken,
      chatId,
      '✅ Фото получено!\n\n⏳ Обработка началась. Это может занять несколько минут...'
    );

    return true;
  } catch (error) {
    console.error('Error handling unique photo upload:', error);
    return false;
  }
}

/**
 * Получает информацию о файле из Telegram
 */
async function getFileInfo(botToken, fileId) {
  const url = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * Отправляет сообщение в Telegram
 */
async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}
