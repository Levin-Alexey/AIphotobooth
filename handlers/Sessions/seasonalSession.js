export default async function handleSeasonalSession() {
  return {
    text: 'Заглушка: Сезонные фотосессии',
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'В главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
