export default async function handleReadyPhoto() {
  return {
    text: 'Хотите один идеальный кадр? \nВыберите атмосферу и получите его без лишних слов🌷',
    replyMarkup: {
      inline_keyboard: [[{ text: 'В главное меню', callback_data: 'back_to_menu' }]]
    }
  };
}
