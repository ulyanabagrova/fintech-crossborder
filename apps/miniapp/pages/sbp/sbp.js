// Конфигурация
const request = require('../../utils/request.js');

// Вспомогательный генератор UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Безопасный парсинг URL-параметров без зависимости от URLSearchParams
const parseQueryParams = (queryString) => {
  if (!queryString) return {};
  return queryString.split('&').reduce((acc, param) => {
    const [key, value] = param.split('=');
    if (key) acc[decodeURIComponent(key)] = decodeURIComponent(value || '');
    return acc;
  }, {});
};

Page({
  data: {
    scannedData: null,
    loading: false,
    currentIdempotencyKey: null,
    errorMessage: null,
    errorDetails: null
  },

  onLoad() {
    // Автоматический запуск камеры при открытии
    this.startScan(true);
  },

  openCameraScan() {
    this.startScan(true);
  },

  openGalleryScan() {
    this.startScan(false);
  },

  async startScan(fromCameraOnly) {
    if (this.data.loading) return;
    this.clearErrors();

    const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
    const isDevTools = deviceInfo.platform === 'devtools';

    if (isDevTools) {
      this.handleDevToolsMenu();
      return;
    }

    try {
      const res = await wx.scanCode({
        onlyFromCamera: fromCameraOnly,
        scanType: ['qrCode']
      });

      if (res.result) {
        this.parseQrResult(res.result);
      }
    } catch (err) {
      if (err.errMsg?.includes('cancel')) return;
      this.setError('Ошибка сканирования QR', err);
    }
  },

  handleDevToolsMenu() {
    wx.showActionSheet({
      itemList: [
        '🧪 Тест: Nike (250 ₽)',
        '🧪 Тест: Ашан (1200 ₽)',
        '✏️ Ввести JSON вручную'
      ],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.parseQrResult(JSON.stringify({ store: 'Nike', amount: 250 }));
        } else if (res.tapIndex === 1) {
          this.parseQrResult(JSON.stringify({ store: 'Ашан', amount: 1200 }));
        } else if (res.tapIndex === 2) {
          this.showManualInputModal();
        }
      }
    });
  },

  async showManualInputModal() {
    try {
      const res = await wx.showModal({
        title: 'Ввод QR-кода',
        editable: true,
        placeholderText: '{"store":"Nike","amount":250}'
      });

      if (res.confirm && res.content) {
        this.parseQrResult(res.content);
      }
    } catch (err) {
      this.setError('Ошибка ввода данных', err);
    }
  },

  parseQrResult(rawString) {
    try {
      this.clearErrors();
      let store = null;
      let amount = null;

      const trimmed = String(rawString).trim();

      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        store = parsed.store || parsed.storeId || parsed.shop;
        amount = Number(parsed.amount);
      } else {
        const queryString = trimmed.split('?')[1] || trimmed;
        const params = parseQueryParams(queryString);
        store = params.store || params.shop;
        amount = Number(params.amount);
      }

      if (!store || !amount || isNaN(amount) || amount <= 0) {
        throw new Error(`Некорректные данные в QR: ${rawString}`);
      }

      const idempotencyKey = generateUUID();

      this.setData(
        {
          scannedData: { store, amount },
          currentIdempotencyKey: idempotencyKey
        },
        () => {
          this.executePayment();
        }
      );
    } catch (e) {
      this.setError('Неверный формат QR-кода', e.message || String(e));
    }
  },

  resetScan() {
    this.setData({
      scannedData: null,
      loading: false,
      currentIdempotencyKey: null
    });
    this.clearErrors();
  },

  onTapSubmit() {
    this.executePayment();
  },

  async executePayment() {
    const { scannedData, currentIdempotencyKey, loading } = this.data;

    // Блокировка повторной отправки
    if (loading) return;

    if (!scannedData?.store || !scannedData?.amount) {
      this.setError('Ошибка состояния', 'Данные сканирования отсутствуют.');
      return;
    }

    const userId = wx.getStorageSync('userId');
    if (!userId) {
      this.setError('Ошибка авторизации', 'userId не найден в wx.getStorageSync("userId")');
      return;
    }

    this.setData({ loading: true });
    this.clearErrors();

    const requestPayload = {
      userId: String(userId).trim(),
      store: String(scannedData.store).trim(),
      amount: Number(scannedData.amount),
      idempotencyKey: currentIdempotencyKey
    };

    try {
      // Используем наш универсальный request.js вместо сырого wx.request и пропавшей API_URL
      const responseData = await request('/sbp/pay-qr', 'POST', requestPayload);

      this.setData({ loading: false });

      if (responseData && responseData.success) {
        const sourceText = responseData.paidFrom === 'voucher_set' 
          ? 'Списано с ваучера!' 
          : 'Списано с карты магазина!';

        wx.showToast({ 
          title: sourceText, 
          icon: 'success',
          duration: 2000
        });

        setTimeout(() => {
          this.resetScan();
          wx.navigateBack({ fail: () => {} });
        }, 1500);
        return;
      }

      this.setError(
        responseData.message || 'Оплата не прошла',
        `Response: ${JSON.stringify(responseData)}`
      );

    } catch (err) {
      this.setData({ loading: false });
      this.setError(
        'Ошибка соединения с сервером',
        `Error: ${JSON.stringify(err)}`
      );
    }
  },

  setError(msg, details = '') {
    const errorDetails = typeof details === 'object' 
      ? JSON.stringify(details, null, 2) 
      : String(details);

    this.setData({
      errorMessage: msg,
      errorDetails
    });
  },

  clearErrors() {
    this.setData({ errorMessage: null, errorDetails: null });
  },

  copyErrorLog() {
    const { errorMessage, errorDetails } = this.data;
    const log = `[ERROR]: ${errorMessage}\n[DETAILS]: ${errorDetails}`;
    
    wx.setClipboardData({
      data: log,
      success: () => {
        wx.showToast({ title: 'Лог скопирован', icon: 'success' });
      }
    });
  }
});