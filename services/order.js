/**
 * Сервис для работы с заказами в D1 базе данных
 */

export class OrderService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Создает новый заказ в статусе 'pending'
   * @param {number} telegramId - ID пользователя в Telegram
   * @param {string} packId - Тип заказа (session_pregnancy, ready_photo и т.д.)
   * @returns {Promise<object>} Созданный заказ с id
   */
  async createOrder(telegramId, packId) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const result = await this.db
        .prepare(
          'INSERT INTO Orders (telegram_id, pack_id, status) VALUES (?, ?, ?)'
        )
        .bind(telegramId, packId, 'pending')
        .run();

      // Получаем созданный заказ
      if (result.meta.duration) {
        // Успешно вставлено, пытаемся получить ID
        const order = await this.db
          .prepare('SELECT * FROM Orders WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1')
          .bind(telegramId)
          .first();
        return order;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Обновляет статус заказа на 'paid' после успешного платежа
   * @param {number} orderId - ID заказа
   * @param {string} yookassaPaymentId - ID платежа в Юкассе
   * @returns {Promise<void>}
   */
  async markOrderAsPaid(orderId, yookassaPaymentId) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      await this.db
        .prepare(
          'UPDATE Orders SET status = ?, updated_at = ? WHERE id = ?'
        )
        .bind('paid', Math.floor(Date.now() / 1000), orderId)
        .run();

      // Логируем информацию о платеже
      console.log(`Order ${orderId} marked as paid. Yookassa Payment ID: ${yookassaPaymentId}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Обновляет статус заказа на 'processing' когда начинается обработка
   * @param {number} orderId - ID заказа
   * @returns {Promise<void>}
   */
  async markOrderAsProcessing(orderId) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      await this.db
        .prepare(
          'UPDATE Orders SET status = ?, updated_at = ? WHERE id = ?'
        )
        .bind('processing', Math.floor(Date.now() / 1000), orderId)
        .run();
    } catch (error) {
      console.error('Error updating order to processing:', error);
      throw error;
    }
  }

  /**
   * Обновляет статус заказа на 'completed' и сохраняет результат
   * @param {number} orderId - ID заказа
   * @param {string|array} resultPhotos - JSON строка с ссылками на результаты
   * @returns {Promise<void>}
   */
  async markOrderAsCompleted(orderId, resultPhotos) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      const resultJson = typeof resultPhotos === 'string' 
        ? resultPhotos 
        : JSON.stringify(resultPhotos);

      await this.db
        .prepare(
          'UPDATE Orders SET status = ?, result_photos = ?, updated_at = ? WHERE id = ?'
        )
        .bind('completed', resultJson, Math.floor(Date.now() / 1000), orderId)
        .run();
    } catch (error) {
      console.error('Error updating order to completed:', error);
      throw error;
    }
  }

  /**
   * Получает заказ по ID
   * @param {number} orderId - ID заказа
   * @returns {Promise<object>} Объект заказа
   */
  async getOrder(orderId) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      return await this.db
        .prepare('SELECT * FROM Orders WHERE id = ?')
        .bind(orderId)
        .first();
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Получает все заказы пользователя
   * @param {number} telegramId - ID пользователя в Telegram
   * @returns {Promise<array>} Массив заказов
   */
  async getUserOrders(telegramId) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      return await this.db
        .prepare('SELECT * FROM Orders WHERE telegram_id = ? ORDER BY created_at DESC')
        .bind(telegramId)
        .all();
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  }
}

/**
 * Сервис для работы с платежами в D1
 */
export class PaymentService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Создает запись о платеже в базе
   * @param {number} orderId - ID заказа
   * @param {string} yookassaPaymentId - ID платежа в Юкассе
   * @param {number} amount - Сумма в копейках
   * @returns {Promise<void>}
   */
  async recordPayment(orderId, yookassaPaymentId, amount) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      await this.db
        .prepare(
          'INSERT INTO Payments (order_id, provider_payment_charge_id, amount, currency, created_at) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(orderId, yookassaPaymentId, amount, 'RUB', Math.floor(Date.now() / 1000))
        .run();
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Получает платеж по ID
   * @param {number} paymentId - ID платежа в системе
   * @returns {Promise<object>} Объект платежа
   */
  async getPayment(paymentId) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      return await this.db
        .prepare('SELECT * FROM Payments WHERE id = ?')
        .bind(paymentId)
        .first();
    } catch (error) {
      console.error('Error getting payment:', error);
      throw error;
    }
  }

  /**
   * Получает платеж по ID заказа
   * @param {number} orderId - ID заказа
   * @returns {Promise<object>} Объект платежа
   */
  async getPaymentByOrderId(orderId) {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      return await this.db
        .prepare('SELECT * FROM Payments WHERE order_id = ?')
        .bind(orderId)
        .first();
    } catch (error) {
      console.error('Error getting payment by order:', error);
      throw error;
    }
  }
}
