Page({
  data: {
    receipt: null
  },

  onLoad(options) {
    if (options.data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(options.data));
        this.setData({ receipt: parsed });
      } catch (e) {
        console.error('Ошибка парсинга чека:', e);
      }
    }
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
});