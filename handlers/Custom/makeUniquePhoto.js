export default async function handleMakeUniquePhoto() {
  return {
    text: 'Сделать уникальное фото',
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'Получить уникальное фото', callback_data: 'custom_unique_pay' }],
        [{ text: 'В главное меню', callback_data: 'back_to_menu' }]
      ]
    }
  };
}
