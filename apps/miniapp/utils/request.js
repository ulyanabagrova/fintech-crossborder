const BASE_URL = 'http://localhost:3000/api/v1';

function request(urlOrOptions, method = 'GET', data = {}) {
  let path = urlOrOptions;
  let reqMethod = method;
  let reqData = data;

  if (typeof urlOrOptions === 'object' && urlOrOptions !== null) {
    path = urlOrOptions.url;
    reqMethod = urlOrOptions.method || 'GET';
    reqData = urlOrOptions.data || {};
  }

  if (!path) path = '';
  if (!path.startsWith('/')) path = '/' + path;

  const fullUrl = `${BASE_URL}${path}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: reqMethod.toUpperCase(),
      data: reqData,
      header: {
        'content-type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const errorMsg =
            res.data && res.data.message
              ? Array.isArray(res.data.message)
                ? res.data.message.join(', ')
                : res.data.message
              : 'Ошибка сервера';

          wx.showToast({
            title: errorMsg,
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
}

module.exports = request;
module.exports.request = request;