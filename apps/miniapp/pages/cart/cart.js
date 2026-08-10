import { request } from '../../utils/request';

Page({
  data: {
    cartItems: [],
    totalPrice: '0.00',
    totalBalance: '0.00',
    loading: true,
    submitting: false
  },

  onShow() {
    this.loadCart();
  },

  onPullDownRefresh() {
    this.loadCart().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // Получение или инициализация userId
  getUserId() {
    let userId = wx.getStorageSync('userId');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      wx.setStorageSync('userId', userId);
    }
    return userId;
  },

  // Загрузка содержимого корзины
  async loadCart() {
    const userId = this.getUserId();
    this.setData({ loading: true });

    try {
      const res = await request(`/cart/${userId}`, 'GET');

      let rawItems = [];
      if (Array.isArray(res)) {
        rawItems = res;
      } else if (res && Array.isArray(res.data)) {
        rawItems = res.data;
      } else if (res && Array.isArray(res.items)) {
        rawItems = res.items;
      }

      const parseNum = (...candidates) => {
        for (const val of candidates) {
          if (val !== undefined && val !== null && val !== '') {
            const num = Number(val);
            if (!isNaN(num)) return num;
          }
        }
        return 0;
      };

      let sumPrice = 0;
      let sumBalance = 0;

      const cartItems = rawItems.map((item, index) => {
        const target = item.card || item.set || item.item || item;

        const quantity = parseNum(item.quantity, 1);

        const price = parseNum(
          item.price_rub,
          item.priceRub,
          target.cost_price_rub,
          target.costPriceRub,
          target.price_rub,
          target.priceRub,
          target.price,
          target.cost
        );

        const balance = parseNum(
          target.balance_rub,
          target.balanceRub,
          target.total_balance_rub,
          target.totalBalanceRub,
          target.balance,
          target.nominal
        );

        sumPrice += price * quantity;
        sumBalance += balance * quantity;

        return {
          ...item,
          id: item.id || item._id || `cart_item_${index}`,
          itemId: item.itemId || item.item_id || target.id,
          itemType: item.itemType || item.item_type || (item.set ? 'set' : 'card'),
          title: target.title || target.store_name || target.storeName || target.name || 'Товар',
          quantity,
          priceFormatted: price,
          balanceFormatted: balance
        };
      });

      this.setData({
        cartItems,
        totalPrice: sumPrice.toFixed(2),
        totalBalance: sumBalance.toFixed(2),
        loading: false
      });
    } catch (err) {
      console.error('Ошибка загрузки корзины:', err);
      this.setData({
        cartItems: [],
        totalPrice: '0.00',
        totalBalance: '0.00',
        loading: false
      });
    }
  },

  // Изменение количества товара
  async onQuantityChange(e) {
    const { id, delta } = e.currentTarget.dataset;
    const item = this.data.cartItems.find(i => i.id === id);
    if (!item) return;

    const newQty = item.quantity + Number(delta);
    if (newQty <= 0) {
      this.onRemoveItem(e);
      return;
    }

    const userId = this.getUserId();

    try {
      await request('/cart/add', 'POST', {
        userId,
        itemId: item.itemId,
        itemType: item.itemType,
        quantity: delta
      });
      this.loadCart();
    } catch (err) {
      console.error('Ошибка изменения количества:', err);
      wx.showToast({ title: 'Не удалось обновить', icon: 'none' });
    }
  },

  // Удаление товара из корзины
  async onRemoveItem(e) {
    const { id } = e.currentTarget.dataset;
    const userId = this.getUserId();

    wx.showModal({
      title: 'Удаление товара',
      content: 'Удалить этот товар из корзины?',
      confirmText: 'Удалить',
      confirmColor: '#e53935',
      cancelText: 'Отмена',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: 'Удаление...' });
            await request(`/cart/${id}/${userId}`, 'DELETE');
            wx.hideLoading();
            wx.showToast({ title: 'Удалено', icon: 'success' });
            this.loadCart();
          } catch (err) {
            wx.hideLoading();
            console.error('Ошибка удаления из корзины:', err);
            wx.showToast({ title: 'Ошибка удаления', icon: 'none' });
          }
        }
      }
    });
  },

  // Оформление заказа / Покупка
  async checkout() {
    await this.onCheckout();
  },

  async onCheckout() {
    if (!this.data.cartItems || this.data.cartItems.length === 0) {
      wx.showToast({ title: 'Корзина пуста', icon: 'none' });
      return;
    }

    if (this.data.submitting) return;

    const userId = this.getUserId();
    this.setData({ submitting: true });

    try {
      wx.showLoading({ title: 'Оформление...', mask: true });

      await request('/cart/checkout', 'POST', { userId });

      wx.hideLoading();

      wx.showToast({
        title: 'Успешно оплачено!',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        this.goToMyCards();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      console.error('Ошибка при оформлении заказа:', err);
      wx.showToast({
        title: err?.data?.message || err?.message || 'Не удалось оформить заказ',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // Навигация в раздел "Мои карты"
  goToMyCards() {
    wx.navigateTo({
      url: '/pages/cards/cards',
      fail: () => {
        wx.switchTab({ url: '/pages/cards/cards' });
      }
    });
  },

  // Вернуться в каталог
  goToCatalog() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  }
});