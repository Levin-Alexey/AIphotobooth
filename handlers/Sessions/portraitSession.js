export default async function handlePortraitSession() {
  return {
    text: 'Заглушка: Портретные фотосессии',
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'В главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
