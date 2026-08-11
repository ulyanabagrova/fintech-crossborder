// apps/web/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';

export default function Home() {
  const router = useRouter();
  const [voucherCards, setVoucherCards] = useState<any[]>([]);
  const [voucherSets, setVoucherSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  function ensureUserId() {
    if (typeof window === 'undefined') return '';
    let userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return '';
    }
    return userId;
  }

  async function loadData() {
    setLoading(true);
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

      const extractArray = (res: any) => {
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

      const parseNum = (...valCandidates: any[]) => {
        for (const val of valCandidates) {
          if (val !== undefined && val !== null && val !== '') {
            const num = Number(val);
            if (!isNaN(num)) return num;
          }
        }
        return 0;
      };

      const parsedCards = rawCards.map((item: any, index: number) => {
        const balance = parseNum(item.balance_rub, item.balanceRub, item.balance, item.nominal, item.nominal_rub);
        const price = parseNum(item.cost_price_rub, item.costPriceRub, item.price_rub, item.priceRub, item.price, item.cost, balance);

        return {
          ...item,
          id: item.id || item._id || item.cardId || `card_${index}`,
          title: item.store_name || item.storeName || item.title || item.name || 'Подарочная карта',
          balanceFormatted: balance,
          priceFormatted: price
        };
      });

      const parsedSets = rawSets.map((item: any, index: number) => {
        const balance = parseNum(item.total_balance_rub, item.totalBalanceRub, item.total_nominal_rub, item.total_balance, item.balance);
        const price = parseNum(item.price_rub, item.priceRub, item.price, item.cost, balance);

        return {
          ...item,
          id: item.id || item._id || item.setId || `set_${index}`,
          title: item.title || item.name || 'Сет ваучеров',
          balanceFormatted: balance,
          priceFormatted: price
        };
      });

      setVoucherCards(parsedCards);
      setVoucherSets(parsedSets);
    } catch (err) {
      console.error('Критическая ошибка при загрузке данных:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(id: string, type: string) {
    const userId = ensureUserId();
    if (!userId || !id || !type) return;

    try {
      setActionLoading(true);
      await request('/cart/add', 'POST', {
        userId,
        itemType: type,
        itemId: id,
        quantity: 1
      });
      alert('Добавлено в корзину');
    } catch (err: any) {
      console.error('Ошибка добавления в корзину:', err);
      alert(err?.message || 'Не удалось добавить');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyNow(id: string, type: string) {
    await handleAddToCart(id, type);
    router.push('/cart');
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white p-4 pb-28 box-border">
      <div className="max-w-2xl mx-auto">
        
        {/* Шапка с кнопкой выхода */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">📂 Каталог</h1>
          <button
            onClick={() => {
              localStorage.removeItem('userId');
              localStorage.removeItem('userEmail');
              router.push('/login');
            }}
            className="bg-[#2a1a1a] border border-[#3d1e1e] text-[#ff4d4f] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#3d1e1e] transition cursor-pointer"
          >
            Выйти
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Загрузка каталога...</div>
        ) : (
          <>
            {voucherCards.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-3 mt-4">Ваучерные карты</h2>
                <div className="flex flex-col gap-3">
                  {voucherCards.map((item) => (
                    <div key={item.id} className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-3">
                      
                      <div className="flex justify-between items-center gap-3">
                        <span className="font-bold text-base flex-1 text-white">{item.title}</span>
                        <span className="text-[#07c160] font-semibold text-sm whitespace-nowrap">
                          Баланс: {item.balanceFormatted} ₽
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-3">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => handleAddToCart(item.id, 'card')}
                            disabled={actionLoading}
                            className="bg-[#2a2a2a] border border-[#444444] text-white text-xs font-medium px-3 py-2 rounded-md hover:opacity-80 transition cursor-pointer"
                          >
                            В корзину
                          </button>
                          <button
                            onClick={() => handleBuyNow(item.id, 'card')}
                            disabled={actionLoading}
                            className="bg-[#07c160] text-white text-xs font-medium px-3 py-2 rounded-md hover:opacity-80 transition cursor-pointer"
                          >
                            Купить
                          </button>
                        </div>

                        <div className="text-right ml-auto whitespace-nowrap">
                          <span className="text-[10px] text-[#888888] block uppercase">Цена:</span>
                          <span className="text-base font-bold text-white">{item.priceFormatted} ₽</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}

            {voucherSets.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-3 mt-4">Сеты ваучеров</h2>
                <div className="flex flex-col gap-3">
                  {voucherSets.map((item) => (
                    <div key={item.id} className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-3">
                      
                      <div className="flex justify-between items-center gap-3">
                        <span className="font-bold text-base flex-1 text-white">{item.title}</span>
                        <span className="text-[#07c160] font-semibold text-sm whitespace-nowrap">
                          Баланс: {item.balanceFormatted} ₽
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-3">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => handleAddToCart(item.id, 'set')}
                            disabled={actionLoading}
                            className="bg-[#2a2a2a] border border-[#444444] text-white text-xs font-medium px-3 py-2 rounded-md hover:opacity-80 transition cursor-pointer"
                          >
                            В корзину
                          </button>
                          <button
                            onClick={() => handleBuyNow(item.id, 'set')}
                            disabled={actionLoading}
                            className="bg-[#07c160] text-white text-xs font-medium px-3 py-2 rounded-md hover:opacity-80 transition cursor-pointer"
                          >
                            Купить
                          </button>
                        </div>

                        <div className="text-right ml-auto whitespace-nowrap">
                          <span className="text-[10px] text-[#888888] block uppercase">Цена:</span>
                          <span className="text-base font-bold text-white">{item.priceFormatted} ₽</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Фиксированное меню внизу */}
      <div className="fixed bottom-0 left-0 right-0 flex p-3 bg-[#1a1a1a] border-t border-[#333] gap-3 z-50 box-border">
        <button
          onClick={() => router.push('/cards')}
          className="flex-1 bg-[#2a2a2a] text-white font-bold text-sm py-2.5 rounded-full text-center hover:opacity-80 transition cursor-pointer"
        >
          🎟️ Мои ваучеры
        </button>
        <button
          onClick={() => router.push('/cart')}
          className="flex-1 bg-[#07c160] text-white font-bold text-sm py-2.5 rounded-full text-center hover:opacity-80 transition cursor-pointer"
        >
          🛒 Корзина
        </button>
      </div>
    </div>
  );
}