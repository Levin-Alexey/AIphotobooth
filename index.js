// Telegram Bot на Cloudflare Worker
import handleReadySessions from './handlers/readySessions.js';
import handleReadyPhoto from './handlers/readyPhoto.js';
import handleCustomEdit from './handlers/customEdit.js';
import handleCare from './handlers/care.js';
import handlePregnancySession from './handlers/Sessions/pregnancySession.js';
import handleNewbornSession from './handlers/Sessions/newbornSession.js';
import handleMonthlySession from './handlers/Sessions/monthlySession.js';
import handleSeasonalSession from './handlers/Sessions/seasonalSession.js';
import handleFamilySession from './handlers/Sessions/familySession.js';
import handleHomeSession from './handlers/Sessions/homeSession.js';
import handlePortraitSession from './handlers/Sessions/portraitSession.js';
import handleMakeUniquePhoto from './handlers/Custom/makeUniquePhoto.js';
import { handleUniquePhotoPay } from './handlers/Custom/uniquePhotoPay.js';
import { handleUniquePhotoPrompt, handleUniquePhotoUpload } from './handlers/Custom/uniquePhotoHandler.js';
import { handlePaymentCallback } from './handlers/payments/paymentCallback.js';

const TELEGRAM_API = 'https://api.telegram.org/bot';

const INLINE_KEYS = {
  READY_SESSIONS: 'ready_sessions',
  READY_PHOTO: 'ready_photo',
  CUSTOM_EDIT: 'custom_edit',
  CARE: 'care',
  BACK_TO_MENU: 'back_to_menu'
};

export default {
  async fetch(request, env) {
    const BOT_TOKEN = env.BOT_TOKEN; // Токен бота из переменных окружения
    const url = new URL(request.url);
    
    // Обработка webhook от Юкассы
    if (url.pathname === '/payment-callback' && request.method === 'POST') {
      return await handlePaymentCallback(request, env, BOT_TOKEN);
    }
    
    if (request.method === 'POST') {
      try {
        const update = await request.json();
        
        // Обработка входящих сообщений
        if (update.message) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          const photo = update.message.photo;
          const user = update.message.from;
          const telegramId = user.id;
          
          // Обработка фото для unique photo
          if (photo) {
            const handled = await handleUniquePhotoUpload(env, telegramId, chatId, photo, BOT_TOKEN);
            if (handled) {
              return new Response('OK', { status: 200 });
            }
          }
          
          // Обработка команды /start
          if (text === '/start') {
            await upsertUser(env.DB, user);
            await sendMainMenu(BOT_TOKEN, chatId);
          } else if (text) {
            // Обработка текстовых сообщений (промпт для unique photo)
            const handled = await handleUniquePhotoPrompt(env, telegramId, chatId, text, BOT_TOKEN);
            // Если не обработали - можно добавить другую логику
          }
        }

        if (update.callback_query) {
          const chatId = update.callback_query.message.chat.id;
          const data = update.callback_query.data;

          switch (data) {
            case INLINE_KEYS.READY_SESSIONS: {
              const { text, replyMarkup } = await handleReadySessions();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case INLINE_KEYS.READY_PHOTO: {
              const { photo, caption, replyMarkup } = await handleReadyPhoto();
              await sendPhoto(BOT_TOKEN, chatId, photo, caption, replyMarkup);
              break;
            }
            case INLINE_KEYS.CUSTOM_EDIT: {
              const { photo, caption, replyMarkup } = await handleCustomEdit();
              await sendPhoto(BOT_TOKEN, chatId, photo, caption, replyMarkup);
              break;
            }
            case INLINE_KEYS.CARE: {
              const { text, replyMarkup } = await handleCare();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case INLINE_KEYS.BACK_TO_MENU:
              await sendMainMenu(BOT_TOKEN, chatId);
              break;
            case 'session_pregnancy': {
              const { text, replyMarkup } = await handlePregnancySession();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case 'session_newborn': {
              const { text, replyMarkup } = await handleNewbornSession();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case 'session_monthly': {
              const { text, replyMarkup } = await handleMonthlySession();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case 'session_seasonal': {
              const { text, replyMarkup } = await handleSeasonalSession();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case 'session_family': {
              const { text, replyMarkup } = await handleFamilySession();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case 'session_home': {
              const { text, replyMarkup } = await handleHomeSession();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case 'session_portrait': {
              const { text, replyMarkup } = await handlePortraitSession();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case 'custom_edit_make': {
              const { text, replyMarkup } = await handleMakeUniquePhoto();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }
            case 'custom_unique_pay': {
              const telegramId = update.callback_query.from.id;
              await handleUniquePhotoPay(env, telegramId, chatId, BOT_TOKEN);
              break;
            }
            default:
              await sendMessage(BOT_TOKEN, chatId, 'Неизвестная команда');
          }
        }
        
        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Error:', error);
        return new Response('Error processing request', { status: 500 });
      }
    }
    
    return new Response('Bot is running', { status: 200 });
  },

  async queue(batch, env) {
    // Queue consumer для обработки заказов из очереди
    const { processQueueMessage } = await import('./services/queueConsumer.js');
    for (const message of batch.messages) {
      try {
        await processQueueMessage(message.body, env);
      } catch (error) {
        console.error('Error processing queue message:', error);
        throw error; // Retry message
      }
    }
  }
};

// Функция для отправки сообщения
async function sendMessage(token, chatId, text, replyMarkup) {
  const url = `${TELEGRAM_API}${token}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: replyMarkup
    })
  });
}

// Функция для отправки фото с подписью
async function sendPhoto(token, chatId, photoUrl, caption, replyMarkup) {
  const url = `${TELEGRAM_API}${token}/sendPhoto`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      reply_markup: replyMarkup
    })
  });
}

async function sendMainMenu(token, chatId) {
  await sendPhoto(
    token,
    chatId,
    'https://image2url.com/r2/default/images/1770660480864-d1f09362-7062-4efe-8c75-b67f1528b322.jpeg',
    'Маленькие ладошки, засыпающий на плече малыш, первый шаг за руку… Эти мгновения уходят так быстро 🥹 Остановите их в кадре!\nПревратите обычное фото в волшебную фотосессию - с цветущим садом, звёздным небом или пушистыми облаками.\nПрямо сейчас, без студии и ожиданий 📸💫 🌸\nСохраните сегодня для завтра 🤍',
    {
      inline_keyboard: [
        [{ text: '📸 Готовые фотосессии', callback_data: INLINE_KEYS.READY_SESSIONS }],
        [{ text: '🖼️ Готовое фото', callback_data: INLINE_KEYS.READY_PHOTO }],
        [{ text: '🎨 Изменить фото по своему описанию', callback_data: INLINE_KEYS.CUSTOM_EDIT }],
        [{ text: '💬 Служба заботы', callback_data: INLINE_KEYS.CARE }]
      ]
    }
  );
}

async function upsertUser(db, user) {
  if (!db || !user?.id) return;

  const telegramId = user.id;
  const username = user.username ?? null;
  const firstName = user.first_name ?? null;
  const now = Math.floor(Date.now() / 1000);

  const existing = await db
    .prepare('SELECT telegram_id FROM Users WHERE telegram_id = ?')
    .bind(telegramId)
    .first();

  if (existing) {
    await db
      .prepare('UPDATE Users SET last_seen = ?, username = ?, first_name = ? WHERE telegram_id = ?')
      .bind(now, username, firstName, telegramId)
      .run();
    return;
  }

  await db
    .prepare('INSERT INTO Users (telegram_id, username, first_name, created_at, last_seen) VALUES (?, ?, ?, ?, ?)')
    .bind(telegramId, username, firstName, now, now)
    .run();
}
