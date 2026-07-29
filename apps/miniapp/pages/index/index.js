import { request } from '../../utils/request';

Page({
  data: {
    card: null,
  },

  onLoad() {
    this.fetchUserCard();
  },


  async fetchUserCard() {
    try {
      const cards = await request('/api/v1/vouchers/my-cards');
      if (cards && cards.length > 0) {
        this.setData({ card: cards[0] });
      }
    } catch (err) {
      console.error('Ошибка загрузки карты:', err);
    }
  },

  handleScanQR() {
    const self = this;
    const mockQrData = 'FT_REDEEM|pos_terminal_01|batch_456|50.00|CNY|a7e4d8f';

    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success(res) {
        console.log('Успешный QR:', res.result);
        self.processRedemption(res.result);
      },
      fail(err) {
        console.log('Симулятор DevTools не смог распарсить QR (это нормально). Запускаем тест:', err);
        
        self.processRedemption(mockQrData);
      }
    });
  },


  async processRedemption(qrData) {
    if (!this.data.card) return;

    wx.showLoading({ title: 'Обработка QR...' });

    try {
      const response = await request('/api/v1/clearing/process', 'POST', {
        cardId: this.data.card.id,
        rawQrData: qrData,
      });

      wx.hideLoading();

      if (response && response.status === 'CLEARED') {
        wx.showToast({ 
          title: `Списано ¥${response.details.deductedAmount}`, 
          icon: 'success' 
        });

      
        this.setData({
          'card.currentCardValue': response.details.remainingBalance
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('Ошибка при списании:', err);
    }
  }
});