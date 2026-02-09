export default async function handleMonthlySession() {
  return {
    text: 'Заглушка: Фотосессии по месяцам',
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'В главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
