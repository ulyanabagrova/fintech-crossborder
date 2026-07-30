// pages/index/index.js
const request = require('../../utils/request.js');

Page({
  data: {
    userCards: [],
    loading: false
  },

  onLoad() {
    this.fetchUserCards();
  },

  // Загружаем только карты текущего пользователя
  async fetchUserCards() {
    try {
      const res = await request('/api/v1/vouchers/my-cards');
      this.setData({ userCards: res });
    } catch (err) {
      console.error('Ошибка загрузки карт:', err);
    }
  },

  // Навигация на страницу сканера СБП
  goToScanner() {
    wx.navigateTo({
      url: '/pages/scan/scan'
    });
  }
});