const request = require('../../utils/request.js');

Page({
  data: {
    userCards: [],
    loading: false
  },

  onShow() {
    this.loadUserCards();
  },

  async loadUserCards() {
    const userId = wx.getStorageSync('userId');

    if (!userId) {
      wx.showToast({ title: 'Пользователь не найден', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: 'Загрузка карт...' });

    try {
      // Делаем запрос на бэкенд за купленными картами
      const res = await request(`/cards/purchased?userId=${userId}`, 'GET');
      this.setData({
        userCards: res || []
      });
    } catch (err) {
      console.error('Ошибка загрузки купленных карт:', err);
      wx.showToast({ title: 'Не удалось загрузить карты', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  // Метод перехода на страницу оплаты по QR
  goToQrPay() {
    wx.navigateTo({
      url: '/pages/sbp/sbp',
      fail: (err) => {
        console.error('Ошибка перехода на страницу СБП:', err);
        wx.showToast({ title: 'Не удалось открыть страницу', icon: 'none' });
      }
    });
  }
});