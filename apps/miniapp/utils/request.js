// Правильно для Vercel (обязательно с HTTPS):
export const BASE_URL = 'https://fintech-crossborder-backend-7go87yjj2-ulyanabagrovas-projects.vercel.app/api/v1';

/**
 * Универсальный HTTP-клиент для WeChat Mini Program
 */
function request(urlOrOptions, method = 'GET', data = {}) {
  let path = '';
  let reqMethod = method;
  let reqData = data;
  let customHeaders = {};

  // Поддержка передачи объекта параметров: request({ url: '...', method: 'POST', data: {...} })
  if (typeof urlOrOptions === 'object' && urlOrOptions !== null) {
    path = urlOrOptions.url || '';
    reqMethod = urlOrOptions.method || 'GET';
    reqData = urlOrOptions.data || {};
    customHeaders = urlOrOptions.header || {};
  } else {
    path = urlOrOptions || '';
  }

  // Обработка формата URL
  let fullUrl = path;
  if (!path.startsWith('http')) {
    if (!path.startsWith('/')) path = '/' + path;
    fullUrl = `${BASE_URL}${path}`;
  }

  // Формируем базовые заголовки
  const headers = {
    'content-type': 'application/json',
    ...customHeaders,
  };

  // Не подставляем Authorization токен на ручки логина/регистрации,
  // чтобы протухший токен из storage не ломал публичные запросы (401 Unauthorized)
  const isAuthEndpoint = fullUrl.includes('/auth/');
  const token = wx.getStorageSync('token');

  if (token && !isAuthEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: reqMethod.toUpperCase(),
      data: reqData,
      header: headers,
      timeout: 15000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        let message = 'Ошибка сервера';
        if (res.data && res.data.message) {
          message = Array.isArray(res.data.message)
            ? res.data.message.join(', ')
            : res.data.message;
        }

        const error = new Error(message);
        error.statusCode = res.statusCode;
        error.data = {
          ...(typeof res.data === 'object' ? res.data : {}),
          message: message,
        };

        reject(error);
      },
      fail: (err) => {
        console.error('[Network Error]', err);
        const error = new Error('Ошибка соединения с сервером');
        error.statusCode = 0;
        error.data = { message: 'Не удалось соединиться с сервером' };
        reject(error);
      },
    });
  });
}

module.exports = request;
module.exports.request = request;
module.exports.default = request;
module.exports.BASE_URL = BASE_URL;