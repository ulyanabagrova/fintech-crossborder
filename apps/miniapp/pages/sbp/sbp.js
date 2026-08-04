const request = require('../../utils/request.js');

Page({
  data: {
    scannedData: null,
    loading: false
  },

  onLoad(options) {
    // Инициализация при загрузке страницы
  },

  openCameraScan() {
    this.startScan(true);
  },

  openGalleryScan() {
    this.startScan(false);
  },

  startScan(fromCameraOnly) {
    // Используем современный wx.getDeviceInfo() вместо устаревшего getSystemInfoSync
    const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
    const isDevTools = deviceInfo.platform === 'devtools';

    // Заглушка для DevTools
    if (isDevTools) {
      wx.showActionSheet({
        itemList: [
          '🧪 Тест: Nike (250 ₽)',
          '🧪 Тест: Ашан (1200 ₽)',
          '✏️ Ввести свой JSON-код вручную'
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
      return;
    }

    // Запуск нативной камеры / альбома на устройстве
    wx.scanCode({
      onlyFromCamera: fromCameraOnly,
      scanType: ['qrCode'],
      success: (res) => {
        if (res.result) {
          this.parseQrResult(res.result);
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        wx.showToast({ title: 'Не удалось считать QR', icon: 'none' });
      }
    });
  },

  showManualInputModal() {
    wx.showModal({
      title: 'Ввод QR-кода',
      editable: true,
      placeholderText: '{"store":"Nike","amount":250}',
      success: (res) => {
        if (res.confirm && res.content) {
          this.parseQrResult(res.content);
        }
      }
    });
  },

  parseQrResult(rawString) {
    try {
      const parsed = JSON.parse(rawString.trim());
      const store = parsed.store || parsed.storeId || parsed.shop;
      const amount = Number(parsed.amount);

      if (!store || !amount || isNaN(amount)) {
        throw new Error('Некорректные данные');
      }

      this.setData({ scannedData: { store, amount } });
    } catch (e) {
      wx.showToast({
        title: 'Неверный формат QR',
        icon: 'none'
      });
    }
  },

  /**
   * Основной метод оплаты
   * @param {boolean} allowStoreCard - разрешение на списание с карты магазина при отсутствии денег на сетах
   */
  async submitPayment(allowStoreCard = false) {
    if (!this.data.scannedData) return;

    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: 'Ошибка авторизации', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: 'Обработка...' });

    try {
      const res = await request('/sbp/pay-qr', 'POST', {
        userId,
        store: this.data.scannedData.store,
        amount: this.data.scannedData.amount,
        allowStoreCard: allowStoreCard
      });

      wx.hideLoading();
      this.setData({ loading: false });

      // 1. Если бэкенд вернул флаг подтверждения (на сетах 0₽, но есть карта магазина)
      if (res.requireConfirmation) {
        wx.showModal({
          title: 'Недостаточно средств на сетах',
          content: res.message || `Мы не обнаружили на ваших сетах денег. Предлагаем списать ${this.data.scannedData.amount} ₽ с другой карты.`,
          confirmText: 'Подтвердить',
          cancelText: 'Отмена',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // Пользователь подтвердил -> вызываем повторно с allowStoreCard = true
              this.submitPayment(true);
            }
          }
        });
        return;
      }

      // 2. Успешное списание (с сета или с карты магазина)
      if (res.success) {
        wx.showModal({
          title: 'Успешно!',
          content: `Оплачено ${res.deducted || this.data.scannedData.amount} ₽ с карты "${res.cardTitle || this.data.scannedData.store}"`,
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });

      console.error('Ошибка при списании:', err);
      wx.showToast({
        title: err.data?.message || err.message || 'Ошибка списания',
        icon: 'none',
        duration: 3000
      });
    }
  },

  resetScan() {
    this.setData({ scannedData: null });
  }
});