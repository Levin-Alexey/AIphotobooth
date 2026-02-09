export default async function handleReadySessions() {
  return {
    text: 'Целая история в одном стиле - как после настоящей студийной съёмки.\nЗагрузите ваши фото и коллекция трогательных кадров уже здесь ✨',
    replyMarkup: {
      inline_keyboard: [
        [{ text: '🤰 Фотосессия беременности', callback_data: 'session_pregnancy' }],
        [{ text: '👶 Фотосессия Newborn', callback_data: 'session_newborn' }],
        [{ text: '📅 Фотосессии по месяцам', callback_data: 'session_monthly' }],
        [{ text: '🌍 Сезонные фотосессии', callback_data: 'session_seasonal' }],
        [{ text: '👨‍👩‍👧‍👦 Семейные фотосессии', callback_data: 'session_family' }],
        [{ text: '🏠 Домашние фотосессии', callback_data: 'session_home' }],
        [{ text: '👤 Портретные фотосессии', callback_data: 'session_portrait' }],
        [{ text: '🔙 Назад в главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
