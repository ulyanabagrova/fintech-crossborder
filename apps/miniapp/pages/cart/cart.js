const request = require('../../utils/request.js');

Page({
  data: {
    cartItems: [],
    totalPrice: 0,
    loading: false
  },

  onShow() {
    this.loadCart();
  },

  async loadCart() {
    const userId = wx.getStorageSync('userId');

    if (!userId) {
      console.warn('User ID отсутствует в хранилище');
      this.setData({ cartItems: [], totalPrice: '0.00' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: 'Загрузка...' });

    try {
      // Запрашиваем корзину из Supabase через NestJS
      const res = await request(`/cart/${userId}`, 'GET');
      
      // Массив приходит от CartService: [{ id, itemType, quantity, details: {...} }]
      const items = res || [];

      // Подсчитываем общую стоимость
      const total = items.reduce((sum, item) => {
        if (!item.details) return sum;
        // Берём цену карточки (balance_rub) или сета (total_price_rub)
        const price = item.itemType === 'card' 
          ? Number(item.details.balance_rub || 0) 
          : Number(item.details.total_price_rub || 0);
        
        return sum + (price * (item.quantity || 1));
      }, 0);

      this.setData({
        cartItems: items,
        totalPrice: total.toFixed(2)
      });
    } catch (err) {
      console.error('Ошибка загрузки корзины с сервера:', err);
      wx.showToast({
        title: 'Не удалось загрузить корзину',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  async removeItem(e) {
    const cartItemId = e.currentTarget.dataset.id; // Передаем ID элемента корзины
    const userId = wx.getStorageSync('userId');

    if (!cartItemId || !userId) return;

    try {
      wx.showLoading({ title: 'Удаление...' });
      
      // Вызываем эндпоинт удаления из базы
      await request(`/cart/${cartItemId}?userId=${userId}`, 'DELETE');
      
      wx.showToast({ title: 'Удалено', icon: 'success' });
      
      // Перезагружаем корзину из БД
      this.loadCart();
    } catch (err) {
      console.error('Ошибка удаления товара из корзины:', err);
    } finally {
      wx.hideLoading();
    }
  },

  async checkout() {
  if (this.data.cartItems.length === 0) {
    wx.showToast({ title: 'Корзина пуста', icon: 'none' });
    return;
  }

  const userId = wx.getStorageSync('userId');
  if (!userId) {
    wx.showToast({ title: 'Ошибка авторизации', icon: 'none' });
    return;
  }

  wx.showLoading({ title: 'Оформление...', mask: true });

  try {
    // 1. Отправляем запрос на покупку всех товаров из корзины
    const res = await request('/cart/checkout', 'POST', { userId });

    wx.hideLoading();
    wx.showToast({ title: 'Покупка успешна!', icon: 'success' });

    // 2. Сразу перенаправляем на страницу «Мои карты»
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/cards/cards' // Укажи точный путь к твоей странице карт
      });
    }, 1200);

  } catch (err) {
    console.error('Ошибка при оформлении заказа:', err);
    wx.hideLoading();
    wx.showToast({
      title: err.data?.message || 'Ошибка оплаты',
      icon: 'none'
    });
  }
}
});