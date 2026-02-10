/**
 * ПРИМЕР ИНТЕГРАЦИИ В index.js
 * 
 * Это показывает как нужно обновить основной файл
 * Копируй нужные части в твой текущий index.js
 */

// ====== ДОБАВИТЬ ИМПОРТЫ ======
import { handlePaymentCallback } from './handlers/payments/paymentCallback.js';
import { initiatePayment } from './handlers/payments/initiatePayment.js';

// ====== В fetch() добавить обработчик платежей ======
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const BOT_TOKEN = env.BOT_TOKEN;
    
    // НОВОЕ: Обработка платежных callback'ов от Юкассы
    if (url.pathname === '/payment-callback' && request.method === 'POST') {
      return await handlePaymentCallback(request, env, BOT_TOKEN);
    }

    if (request.method === 'POST') {
      try {
        const update = await request.json();
        
        // === ОБРАБОТКА СООБЩЕНИЙ ===
        if (update.message) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          const user = update.message.from;
          
          if (text === '/start') {
            await upsertUser(env.DB, user);
            await sendMainMenu(BOT_TOKEN, chatId);
          }
        }

        // === ОБРАБОТКА CALLBACK КНОПОК ===
        if (update.callback_query) {
          const chatId = update.callback_query.message.chat.id;
          const telegramId = update.callback_query.from.id;  // НОВОЕ: получаем ID
          const data = update.callback_query.data;

          switch (data) {
            // === ФОТОСЕССИИ (7 типов) ===
            case 'session_pregnancy': {
              // НОВОЕ: Инициируем платеж вместо отправки сообщения
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'session_pregnancy',
                BOT_TOKEN
              );
              break;
            }
            case 'session_newborn': {
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'session_newborn',
                BOT_TOKEN
              );
              break;
            }
            case 'session_monthly': {
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'session_monthly',
                BOT_TOKEN
              );
              break;
            }
            case 'session_seasonal': {
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'session_seasonal',
                BOT_TOKEN
              );
              break;
            }
            case 'session_family': {
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'session_family',
                BOT_TOKEN
              );
              break;
            }
            case 'session_home': {
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'session_home',
                BOT_TOKEN
              );
              break;
            }
            case 'session_portrait': {
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'session_portrait',
                BOT_TOKEN
              );
              break;
            }

            // === ГОТОВОЕ ФОТО ===
            case 'ready_photo': {
              const { photo, caption, replyMarkup } = await handleReadyPhoto();
              await sendPhoto(BOT_TOKEN, chatId, photo, caption, replyMarkup);
              break;
            }

            // === СДЕЛАТЬ ИДЕАЛЬНОЕ ФОТО (новая кнопка) ===
            case 'ready_photo_make': {
              // НОВОЕ: Инициируем платеж за обработку готового фото
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'ready_photo',
                BOT_TOKEN
              );
              break;
            }

            // === КРАСИВОЕ ФОТО ПО ОПИСАНИЮ ===
            case 'custom_edit': {
              const { text, replyMarkup } = await handleCustomEdit();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
              break;
            }

            // === ГЕНЕРАЦИЯ ПО ПРОМПТУ ===
            case 'custom_edit_make': {
              // НОВОЕ: Инициируем платеж за генерацию по промпту
              await initiatePayment(
                env,
                telegramId,
                chatId,
                'custom_edit',
                BOT_TOKEN
              );
              break;
            }

            // === ОСТАЛЬНОЕ ===
            case INLINE_KEYS.READY_SESSIONS: {
              const { text, replyMarkup } = await handleReadySessions();
              await sendMessage(BOT_TOKEN, chatId, text, replyMarkup);
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
  }
};

/**
 * ДАЛЬШЕ ВСЕ ОСТАЛЬНЫЕ ФУНКЦИИ КАК БЫЛО
 * sendMessage, sendPhoto, sendMainMenu и т.д.
 */
