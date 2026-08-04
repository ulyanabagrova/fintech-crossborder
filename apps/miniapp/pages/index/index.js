const request = require('../../utils/request.js');
const { login } = require('../../utils/auth.js');

Page({
  data: {
    voucherSets: [],
    voucherCards: [],
    cartCount: 0
  },

  onShow() {
    this.loadData();
    this.ensureUserAndFetchCart();
  },

  // Загрузка списков сетов и карт
  async loadData() {
    try {
      const sets = await request('/vouchers/sets', 'GET');
      this.setData({ voucherSets: sets || [] });
    } catch (err) {
      console.error('Ошибка загрузки сетов:', err);
    }

    try {
      const cards = await request('/vouchers/cards', 'GET');
      this.setData({ voucherCards: cards || [] });
    } catch (err) {
      console.error('Ошибка загрузки карт:', err);
    }
  },

  // Проверка сессии и получение счетчика корзины
  async ensureUserAndFetchCart() {
    let userId = wx.getStorageSync('userId');
    if (!userId) {
      try {
        const user = await login();
        userId = user.id;
      } catch (e) {
        console.error('Не удалось автоматически авторизовать пользователя:', e);
        return;
      }
    }
    this.fetchCartCount(userId);
  },

  // Получение количества товаров в корзине
  async fetchCartCount(userId) {
    const id = userId || wx.getStorageSync('userId');
    if (!id) return;

    try {
      const res = await request(`/cart/${id}`, 'GET');
      const count = Array.isArray(res)
        ? res.reduce((acc, item) => acc + (item.quantity || 1), 0)
        : 0;
      this.setData({ cartCount: count });
    } catch (err) {
      console.error('Ошибка получения количества в корзине:', err);
    }
  },

  // Добавление товара в корзину
  async onAddToCart(e) {
    const { type, id } = e.currentTarget.dataset;
    let userId = wx.getStorageSync('userId');

    if (!userId) {
      wx.showLoading({ title: 'Авторизация...' });
      try {
        const user = await login();
        userId = user.id;
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: 'Авторизуйтесь для покупки', icon: 'none' });
        return;
      }
    }

    wx.showLoading({ title: 'Добавление...' });

    try {
      await request('/cart/add', 'POST', {
        userId: userId,
        itemType: type,
        itemId: id,
        quantity: 1
      });

      wx.showToast({ title: 'Добавлено!', icon: 'success' });
      this.fetchCartCount(userId);
    } catch (err) {
      console.error('Ошибка добавления:', err);
      wx.showToast({ title: 'Ошибка добавления', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // Покупка в 1 клик (добавление + сразу переход в корзину)
  async onBuyNow(e) {
    const { type, id } = e.currentTarget.dataset;
    let userId = wx.getStorageSync('userId');

    if (!userId) {
      wx.showLoading({ title: 'Авторизация...' });
      try {
        const user = await login();
        userId = user.id;
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: 'Авторизуйтесь для покупки', icon: 'none' });
        return;
      }
    }

    wx.showLoading({ title: 'Оформление...' });

    try {
      await request('/cart/add', 'POST', {
        userId: userId,
        itemType: type,
        itemId: id,
        quantity: 1
      });

      this.goToCart();
    } catch (err) {
      console.error('Ошибка быстрой покупки:', err);
      wx.showToast({ title: 'Не удалось добавить товар', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // Переход в корзину
  goToCart() {
    wx.navigateTo({
      url: '/pages/cart/cart'
    });
  },

  // Переход в "Мои карты"
  goToMyCards() {
    wx.navigateTo({
      url: '/pages/cards/cards'
    });
  }
});