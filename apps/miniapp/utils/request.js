// Правильно (http без s):
export const BASE_URL = 'http://localhost:3000/api/v1';

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

  // Получаем токен или авторизацию (если используется)
  const token = wx.getStorageSync('token');
  const headers = {
    'content-type': 'application/json',
    ...customHeaders,
  };

  if (token) {
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
        // HTTP 200 - 299: Успех
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        // Вытаскиваем сообщение об ошибке от NestJS (строка или массив из DTO)
        let message = 'Ошибка сервера';
        if (res.data && res.data.message) {
          message = Array.isArray(res.data.message)
            ? res.data.message.join(', ')
            : res.data.message;
        }

        // Формируем стандартизированный объект ошибки
        const error = new Error(message);
        error.statusCode = res.statusCode;
        error.data = {
          ...(typeof res.data === 'object' ? res.data : {}),
          message: message, // Гарантируем, что message — это всегда нормальная строка
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

// Поддержка CommonJS (require) и ES Modules (import)
module.exports = request;
module.exports.request = request;
module.exports.default = request;
module.exports.BASE_URL = BASE_URL;