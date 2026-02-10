export default async function handleMakeReadyPhoto() {
  return {
    text: 'Заглушка: Сделать идеальное фото',
    replyMarkup: {
      inline_keyboard: [[{ text: 'В главное меню', callback_data: 'back_to_menu' }]]
    }
  };
}
