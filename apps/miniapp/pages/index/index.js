import { request } from '../../utils/request';

Page({
  data: {
    voucherCards: [],
    voucherSets: [],
    loading: true
  },

  onLoad() {
    this.ensureUserId();
    this.loadData();
  },

  // Гарантируем наличие userId для работы корзины
  ensureUserId() {
    let userId = wx.getStorageSync('userId');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      wx.setStorageSync('userId', userId);
    }
    return userId;
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadData() {
    wx.showLoading({ title: 'Загрузка...' });
    this.setData({ loading: true });

    try {
      const [cardsRes, setsRes] = await Promise.all([
        request('/vouchers/cards').catch(err => {
          console.error('Ошибка загрузки карт:', err);
          return null;
        }),
        request('/vouchers/sets').catch(err => {
          console.error('Ошибка загрузки сетов:', err);
          return null;
        })
      ]);

      const extractArray = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.result)) return res.result;
        if (Array.isArray(res.items)) return res.items;
        if (res.data && Array.isArray(res.data.data)) return res.data.data;
        if (res.data && Array.isArray(res.data.items)) return res.data.items;
        if (res.data && Array.isArray(res.data.result)) return res.data.result;
        return [];
      };

      const rawCards = extractArray(cardsRes);
      const rawSets = extractArray(setsRes);

      // Вспомогательная функция безопасного парсинга чисел
      const parseNum = (...valCandidates) => {
        for (const val of valCandidates) {
          if (val !== undefined && val !== null && val !== '') {
            const num = Number(val);
            if (!isNaN(num)) return num;
          }
        }
        return 0;
      };

      const voucherCards = rawCards.map((item, index) => {
        const balance = parseNum(
          item.balance_rub,
          item.balanceRub,
          item.balance,
          item.nominal,
          item.nominal_rub
        );

        const price = parseNum(
          item.cost_price_rub,
          item.costPriceRub,
          item.price_rub,
          item.priceRub,
          item.price,
          item.cost,
          balance
        );

        return {
          ...item,
          id: item.id || item._id || item.cardId || `card_${index}`,
          title: item.store_name || item.storeName || item.title || item.name || 'Подарочная карта',
          balanceFormatted: balance,
          priceFormatted: price
        };
      });

      const voucherSets = rawSets.map((item, index) => {
        const balance = parseNum(
          item.total_balance_rub,
          item.totalBalanceRub,
          item.total_nominal_rub,
          item.total_balance,
          item.balance
        );

        const price = parseNum(
          item.price_rub,
          item.priceRub,
          item.price,
          item.cost,
          balance
        );

        return {
          ...item,
          id: item.id || item._id || item.setId || `set_${index}`,
          title: item.title || item.name || 'Сет ваучеров',
          balanceFormatted: balance,
          priceFormatted: price
        };
      });

      this.setData({
        voucherCards,
        voucherSets,
        loading: false
      });
    } catch (err) {
      console.error('Критическая ошибка при загрузке данных:', err);
      wx.showToast({ title: 'Ошибка загрузки', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  // Отправка карты/сета на бэкенд в корзину
  async onAddToCart(e) {
    const { id, type } = e.currentTarget.dataset;
    const userId = this.ensureUserId();

    if (!id || !type) {
      wx.showToast({ title: 'Ошибка параметров товара', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: 'Добавление...', mask: true });

      await request('/cart/add', 'POST', {
        userId,
        itemType: type, // 'card' или 'set'
        itemId: id,
        quantity: 1
      });

      wx.showToast({
        title: 'Добавлено в корзину',
        icon: 'success'
      });
    } catch (err) {
      console.error('Ошибка добавления в корзину:', err);
      wx.showToast({
        title: err?.data?.message || err?.message || 'Не удалось добавить',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // Быстрая покупка: добавление + моментальный переход в корзину
  async onBuyNow(e) {
    await this.onAddToCart(e);
    this.goToCart();
  },

  // Навигация в Корзину
  goToCart() {
    wx.navigateTo({
      url: '/pages/cart/cart',
      fail: () => {
        wx.switchTab({ url: '/pages/cart/cart' });
      }
    });
  },

  // Навигация в "Мои карты"
  goToMyCards() {
    wx.navigateTo({
      url: '/pages/cards/cards',
      fail: () => {
        wx.switchTab({ url: '/pages/cards/cards' });
      }
    });
  }
});