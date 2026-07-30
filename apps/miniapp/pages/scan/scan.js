// pages/scan/scan.js
const request = require('../../utils/request.js');

Page({
  data: {
    paymentResult: null
  },

  onLoad() {
    this.startScan();
  },

  async startScan() {
    const self = this;

    wx.scanCode({
      scanType: ['qrCode'],
      success: (res) => {
        self.processSbpQr(res.result);
      },
      fail: () => {
        // Mock-ссылка СБП НСПК для эмулятора
        const mockSbpUrl = 'https://qr.nspk.ru/AD100004B8324147B129412412891284';
        self.processSbpQr(mockSbpUrl);
      }
    });
  },

  async processSbpQr(qrData) {
    wx.showLoading({ title: 'Клиринг СБП & Vault...' });

    try {
      const res = await request('/api/v1/sbp/pay', 'POST', { qrData });
      wx.hideLoading();

      if (res.success) {
        this.setData({ paymentResult: res });
      }
    } catch (err) {
      wx.hideLoading();
    }
  },

  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});