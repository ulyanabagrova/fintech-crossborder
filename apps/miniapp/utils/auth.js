const request = require('./request.js');

async function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        if (res.code) {
          try {
            const result = await request('/auth/wechat-login', 'POST', { code: res.code });
            if (result && result.success && result.user) {
              wx.setStorageSync('user', result.user);
              wx.setStorageSync('userId', result.user.id);
              resolve(result.user);
            } else {
              reject(new Error('Ошибка авторизации: пустой ответ от сервера'));
            }
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('Не удалось получить code от WeChat'));
        }
      },
      fail: (err) => reject(err)
    });
  });
}

function getCurrentUser() {
  return wx.getStorageSync('user') || null;
}

module.exports = {
  login,
  getCurrentUser
};