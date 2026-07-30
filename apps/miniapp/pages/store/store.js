// pages/store/store.js
const request = require('../../utils/request.js');

Page({
  data: {
    catalog: {
      brands: [],
      templates: []
    },
    loading: false
  },

  onLoad() {
    this.fetchCatalog();
  },

  // Загрузка каталога брендов и сетов с бэкенда
  async fetchCatalog() {
    this.setData({ loading: true });
    try {
      const catalog = await request('/api/v1/vouchers/catalog');
      this.setData({ catalog, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      console.error('Ошибка загрузки каталога:', err);
    }
  },

  // Покупка карты или сета
  async buyCard(e) {
    const templateId = e.currentTarget.dataset.id;
    wx.showLoading({ title: 'Оформление карты...' });

    try {
      const res = await request('/api/v1/vouchers/buy', 'POST', { templateId });
      wx.hideLoading();

      if (res.success) {
        wx.showToast({ 
          title: 'Карта куплена! 🎉', 
          icon: 'success' 
        });

        // Возвращаемся на главную к картам через 1.5 сек
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1500);
      }
    } catch (err) {
      wx.hideLoading();
    }
  }
});