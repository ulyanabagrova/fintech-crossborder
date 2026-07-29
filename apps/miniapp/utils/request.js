const BASE_URL = 'http://localhost:3000'; // Наш локальный NestJS бэкенд

export const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          wx.showToast({
            title: res.data.message || 'Ошибка сервера',
            icon: 'none',
          });
          reject(res.data);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: 'Ошибка соединения с сервером',
          icon: 'none',
        });
        reject(err);
      },
    });
  });
};