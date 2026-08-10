// Базовый домен без префикса
export const DOMAIN = 'https://fintech-crossborder-backend-7go87yjj2-ulyanabagrovas-projects.vercel.app';
export const API_PREFIX = '/api/v1';
export const BASE_URL = `${DOMAIN}${API_PREFIX}`;

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

  // Сборка полного URL с защитой от двойного префикса
  let fullUrl = path;
  if (!path.startsWith('http')) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Если относительный путь уже содержит /api/v1, клеим к чистому домену
    if (path.startsWith(API_PREFIX)) {
      fullUrl = `${DOMAIN}${path}`;
    } else {
      fullUrl = `${BASE_URL}${path}`;
    }
  }

  // Нормализация двойных слэшей (кроме https://)
  fullUrl = fullUrl.replace(/([^:]\/)\/+/g, '$1');

  // Формируем базовые заголовки
  const headers = {
    'content-type': 'application/json',
    ...customHeaders,
  };

  // Не подставляем Authorization токен на ручки авторизации
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
module.exports.DOMAIN = DOMAIN;
module.exports.API_PREFIX = API_PREFIX;