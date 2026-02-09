export default async function handleCare() {
  return {
    text: 'Заглушка: Служба заботы',
    replyMarkup: {
      inline_keyboard: [[{ text: 'В главное меню', callback_data: 'back_to_menu' }]]
    }
  };
}
