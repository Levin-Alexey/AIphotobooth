export default async function handlePregnancySession() {
  return {
    text: 'Заглушка: Фотосессия беременности',
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'В главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
