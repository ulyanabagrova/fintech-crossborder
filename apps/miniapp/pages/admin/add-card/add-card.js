const request = require('../../../utils/request.js');

Page({
  async submitCard(e) {
    const { title, amountRUB, priceCNY } = e.detail.value;

    if (!title || !amountRUB || !priceCNY) {
      wx.showToast({ title: 'Заполните все поля', icon: 'none' });
      return;
    }

    wx.showLoading({ title: 'Сохранение в БД...' });

    try {
      const res = await request('/api/v1/vouchers/create-template', 'POST', {
        title,
        amountRUB: parseFloat(amountRUB),
        priceCNY: parseFloat(priceCNY),
        merchantId: 'merchant-default'
      });

      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: 'Карта добавлена! 🎉', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1200);
      }
    } catch (err) {
      wx.hideLoading();
    }
  }
});