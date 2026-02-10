export default async function handleMakeUniquePhoto() {
  return {
    text: 'Сделать уникальное фото',
    replyMarkup: {
      inline_keyboard: [[{ text: 'В главное меню', callback_data: 'back_to_menu' }]]
    }
  };
}
