const request = require('./utils/request.js');

App({
  onLaunch() {
    this.checkAuth();
  },

  async checkAuth() {
    const userId = wx.getStorageSync('userId');

    // Если пользователь уже авторизован
    if (userId) {
      console.log('Пользователь уже авторизован в хранилище:', userId);
      return;
    }

    // Если авторизация отсутствует — логинимся через WeChat
    wx.login({
      success: async (res) => {
        if (!res.code) {
          console.error('Не удалось получить code от WeChat');
          return;
        }

        try {
          const data = await request('/auth/wechat-login', 'POST', { code: res.code });

          if (data && data.user && data.user.id) {
            wx.setStorageSync('userId', data.user.id);
            if (data.user.wechat_openid) {
              wx.setStorageSync('wechatOpenId', data.user.wechat_openid);
            }
            
            console.log('Сессия успешно создана и сохранена! User ID:', data.user.id);
          } else {
            console.error('Сервер вернул ответ без объекта пользователя:', data);
          }
        } catch (err) {
          console.error('Ошибка входа через WeChat:', err);
          wx.removeStorageSync('userId');
        }
      },
      fail: (err) => {
        console.error('Ошибка вызова wx.login:', err);
      }
    });
  },

  navigateToIndex() {
    wx.switchTab({
      url: '/pages/index/index',
      fail: (err) => {
        console.log('Переход через switchTab не удался, пробуем reLaunch...', err);
        wx.reLaunch({
          url: '/pages/index/index',
          fail: (reLaunchErr) => {
            console.error('Критическая ошибка перехода на главную:', reLaunchErr);
          }
        });
      }
    });
  }
});