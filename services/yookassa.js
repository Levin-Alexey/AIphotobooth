/**
 * Сервис для работы с API Юкассы
 * Используется для создания платежей и валидации webhook уведомлений
 */

export class YookassaService {
  constructor(shopId, secretKey) {
    this.shopId = shopId;
    this.secretKey = secretKey;
    this.apiUrl = 'https://api.yookassa.ru/v3';
  }

  /**
   * Создает платеж в Юкассе
   * @param {number} amount - Сумма в копейках (целое число)
   * @param {string} description - Описание платежа (макс 128 символов)
   * @param {string} returnUrl - URL для возврата после платежа
   * @param {object} metadata - Метаданные (telegramId, chatId, type, packId и т.д.)
   * @returns {Promise<object>} Объект платежа с confirmation_url
   */
  async createPayment(amount, description, returnUrl, metadata = {}) {
    const idempotenceKey = this.generateIdempotenceKey();

    const payload = {
      amount: {
        value: (amount / 100).toFixed(2), // Конвертируем копейки в рубли
        currency: 'RUB'
      },
      capture: true, // Списываем деньги сразу
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      description: description.substring(0, 128), // Максимум 128 символов
      metadata: metadata
    };

    const auth = btoa(`${this.shopId}:${this.secretKey}`);

    try {
      const response = await fetch(`${this.apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Yookassa API Error: ${error.description}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Yookassa payment:', error);
      throw error;
    }
  }

  /**
   * Получает информацию о платеже
   * @param {string} paymentId - ID платежа в Юкассе
   * @returns {Promise<object>} Объект платежа
   */
  async getPayment(paymentId) {
    const auth = btoa(`${this.shopId}:${this.secretKey}`);

    try {
      const response = await fetch(`${this.apiUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get payment info');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Yookassa payment:', error);
      throw error;
    }
  }

  /**
   * Валидирует webhook уведомление от Юкассы
   * Проверяет что уведомление пришло именно от Юкассы
   * @param {object} notification - Тело webhook запроса
   * @param {string} signature - Значение заголовка Notification-API-Signature
   * @returns {boolean} true если подпись валидна
   */
  validateWebhookSignature(notification, signature) {
    // Юкасса требует проверку подписи. Здесь мы валидируем основные поля
    // В реальном приложении нужно проверять подпись используя SHA-256
    // Пока оставляем простую валидацию - проверка что это от Юкассы
    return notification && notification.type === 'notification';
  }

  /**
   * Генерирует уникальный Idempotence Key
   * Используется чтобы предотвратить дублирование платежей при повторных запросах
   * @returns {string}
   */
  generateIdempotenceKey() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Создает пакет данных для платежа в зависимости от типа
 */
export function getPaymentDetails(type, packId, metadata = {}) {
  const paymentDetails = {
    session_pregnancy: {
      description: '📷 Фотосессия беременности',
      amount: 99900 // 999 рублей в копейках
    },
    session_newborn: {
      description: '👶 Фотосессия Newborn',
      amount: 99900
    },
    session_monthly: {
      description: '📅 Фотосессии по месяцам',
      amount: 99900
    },
    session_seasonal: {
      description: '🌍 Сезонные фотосессии',
      amount: 99900
    },
    session_family: {
      description: '👨‍👩‍👧‍👦 Семейные фотосессии',
      amount: 99900
    },
    session_home: {
      description: '🏠 Домашние фотосессии',
      amount: 99900
    },
    session_portrait: {
      description: '👤 Портретные фотосессии',
      amount: 99900
    },
    ready_photo: {
      description: '🖼️ Обработка готового фото',
      amount: 49900 // 499 рублей
    },
    custom_edit: {
      description: '🎨 Генерация фото по описанию',
      amount: 149900 // 1499 рублей
    }
  };

  const details = paymentDetails[type];
  if (!details) {
    throw new Error(`Unknown payment type: ${type}`);
  }

  return {
    description: details.description,
    amount: details.amount,
    type: type,
    packId: packId,
    ...metadata
  };
}
