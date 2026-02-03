// Telegram Bot на Cloudflare Worker
const TELEGRAM_API = 'https://api.telegram.org/bot';

export default {
  async fetch(request, env) {
    const BOT_TOKEN = env.BOT_TOKEN; // Токен бота из переменных окружения
    
    if (request.method === 'POST') {
      try {
        const update = await request.json();
        
        // Обработка входящих сообщений
        if (update.message) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          
          // Обработка команды /start
          if (text === '/start') {
            await sendMessage(BOT_TOKEN, chatId, 'Привет, я бот');
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

// Функция для отправки сообщения
async function sendMessage(token, chatId, text) {
  const url = `${TELEGRAM_API}${token}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}
