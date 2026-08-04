const { login } = require('../../utils/auth.js');

Page({
  async handleWechatLogin() {
    wx.showLoading({ title: 'Авторизация...' });

    try {
      const user = await login();
      wx.hideLoading();

      if (user && user.id) {
        wx.showToast({
          title: 'Успешный вход!',
          icon: 'success',
          duration: 1000
        });

        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1000);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('Ошибка входа:', error);
      wx.showToast({ title: 'Ошибка авторизации', icon: 'none' });
    }
  }
});