// apps/web/app/cart/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [totalPrice, setTotalPrice] = useState('0.00');
  const [totalBalance, setTotalBalance] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }
    loadCart(userId);
  }, [router]);

  function getUserId() {
    if (typeof window === 'undefined') return '';
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return '';
    }
    return userId;
  }

  async function loadCart(userId: string) {
    setLoading(true);
    try {
      const res = await request(`/cart/${userId}`, 'GET');

      let rawItems: any[] = [];
      if (Array.isArray(res)) {
        rawItems = res;
      } else if (res && Array.isArray(res.data)) {
        rawItems = res.data;
      } else if (res && Array.isArray(res.items)) {
        rawItems = res.items;
      }

      const parseNum = (...candidates: any[]) => {
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

      const items = rawItems.map((item: any, index: number) => {
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

      setCartItems(items);
      setTotalPrice(sumPrice.toFixed(2));
      setTotalBalance(sumBalance.toFixed(2));
    } catch (err) {
      console.error('Ошибка загрузки корзины:', err);
      setCartItems([]);
      setTotalPrice('0.00');
      setTotalBalance('0.00');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveItem(id: string) {
    if (!confirm('Удалить этот товар из корзины?')) return;

    const userId = getUserId();
    if (!userId) return;

    try {
      await request(`/cart/${id}/${userId}`, 'DELETE');
      loadCart(userId);
    } catch (err) {
      console.error('Ошибка удаления из корзины:', err);
      alert('Ошибка при удалении товара');
    }
  }

  async function handleCheckout() {
    if (!cartItems || cartItems.length === 0) {
      alert('Корзина пуста');
      return;
    }

    if (submitting) return;

    const userId = getUserId();
    if (!userId) return;

    setSubmitting(true);

    try {
      await request('/cart/checkout', 'POST', { userId });
      alert('Успешно оплачено!');
      router.push('/cards');
    } catch (err: any) {
      console.error('Ошибка при оформлении заказа:', err);
      alert(err?.message || 'Не удалось оформить заказ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white p-4 pb-28 box-border">
      <div className="max-w-2xl mx-auto">
        
        {/* Шапка с кнопкой назад */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition cursor-pointer text-xl"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">🛒 Корзина</h1>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Загрузка корзины...</div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="mb-4">Корзина пуста</p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#2a2a2a] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-80 transition cursor-pointer"
            >
              Перейти в каталог
            </button>
          </div>
        ) : (
          <>
            {/* Список товаров */}
            <div className="flex flex-col gap-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1e1e1e] p-3.5 rounded-xl border border-[#2a2a2a] flex justify-between items-center"
                >
                  <div className="flex-1 pr-3">
                    <div className="text-white font-bold text-sm">{item.title}</div>
                    
                    <div className="text-[#888888] text-xs mt-1">
                      Тип: {item.itemType === 'card' ? 'Карта' : 'Сет'}{' '}
                      {item.quantity > 1 ? `x${item.quantity}` : ''}
                    </div>

                    <div className="flex gap-3 mt-1.5 items-center">
                      <span className="text-[#07c160] text-xs font-semibold">
                        Баланс: {item.balanceFormatted} ₽
                      </span>
                      <span className="text-white text-sm font-bold">
                        Цена: {item.priceFormatted} ₽
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-[#ff4d4f] text-xs px-3 py-2 bg-[#2a1a1a] border border-[#3d1e1e] rounded-md whitespace-nowrap hover:bg-[#3d1e1e] transition cursor-pointer"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>

            {/* Итоговый блок */}
            <div className="mt-8 bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
              <div className="flex justify-between items-center text-white font-bold text-base mb-4">
                <span>Итого к оплате:</span>
                <span className="text-[#07c160] text-lg">{totalPrice} ₽</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="w-full bg-[#07c160] text-white font-bold rounded-full text-center py-3 text-sm hover:opacity-80 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Оформление...' : 'Оплатить'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}