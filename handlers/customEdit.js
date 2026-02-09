export default async function handleCustomEdit() {
  return {
    text: 'Не нашли готовый сет?\nПросто опишите атмосферу и получите фото которого нет ни у кого больше ✨',
    replyMarkup: {
      inline_keyboard: [[{ text: 'В главное меню', callback_data: 'back_to_menu' }]]
    }
  };
}
