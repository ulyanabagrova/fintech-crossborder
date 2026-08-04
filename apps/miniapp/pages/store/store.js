// pages/store/store.js
const request = require('../../utils/request.js');

Page({
  data: {
    vouchers: []
  },

  onShow() {
    this.fetchVouchers();
  },

  async fetchVouchers() {
    wx.showLoading({ title: 'Загрузка карт...' });
    try {
      const res = await request('/api/v1/vouchers/list', 'GET');
      wx.hideLoading();

      if (res && res.success) {
        this.setData({ vouchers: res.templates });
      }
    } catch (err) {
      wx.hideLoading();
    }
  },

  goToAddCard() {
    wx.navigateTo({
      url: '/pages/admin/add-card'
    });
  }
});