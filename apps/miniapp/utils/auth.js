const request = require('./request.js');

async function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        if (!res.code) {
          return reject(new Error('Не удалось получить code от WeChat'));
        }

        try {
          // Отправляем запрос на авторизацию
          const result = await request('/auth/wechat-login', 'POST', { code: res.code });

          // Гибкое извлечение токена и данных пользователя
          const token = result.token || result.accessToken || result.data?.token || result.access_token;
          const user = result.user || result.data?.user || result;

          if (token || user) {
            if (token) {
              wx.setStorageSync('token', token);
            }
            if (user && typeof user === 'object') {
              wx.setStorageSync('user', user);
              if (user.id || user._id) {
                wx.setStorageSync('userId', user.id || user._id);
              }
            }
            resolve(user);
          } else {
            reject(new Error('Ошибка авторизации: пустой ответ от сервера'));
          }
        } catch (err) {
          console.error('[Auth Service Error]', err);
          reject(err);
        }
      },
      fail: (err) => {
        console.error('[wx.login Fail]', err);
        reject(err);
      }
    });
  });
}

function getCurrentUser() {
  return wx.getStorageSync('user') || null;
}

function logout() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('user');
  wx.removeStorageSync('userId');
}

module.exports = {
  login,
  getCurrentUser,
  logout
};