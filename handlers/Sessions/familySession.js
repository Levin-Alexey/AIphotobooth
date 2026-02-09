export default async function handleFamilySession() {
  return {
    text: 'Заглушка: Семейные фотосессии',
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'В главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
