export default async function handleHomeSession() {
  return {
    text: 'Заглушка: Домашние фотосессии',
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'В главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
