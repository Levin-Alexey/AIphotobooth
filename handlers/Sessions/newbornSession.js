export default async function handleNewbornSession() {
  return {
    text: 'Заглушка: Фотосессия Newborn',
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'В главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
