'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';

export default function MyCardsPage() {
  const router = useRouter();
  const [userCards, setUserCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rawUserId = localStorage.getItem('userId');
    if (!rawUserId) {
      router.push('/login');
      return;
    }
    
    const cleanUserId = rawUserId.replace(/['"]/g, '');
    loadUserCards(cleanUserId);
  }, [router]);

  async function loadUserCards(userId: string) {
    setLoading(true);
    try {
      const res = await request(`/cards/purchased?userId=${encodeURIComponent(userId)}`, 'GET');

      const extractArray = (response: any) => {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.result)) return response.result;
        if (Array.isArray(response.items)) return response.items;
        return [];
      };

      setUserCards(extractArray(res));
    } catch (err) {
      console.error('❌ [MyCards] Ошибка:', err);
      setUserCards([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white p-4">
      <div className="max-w-2xl mx-auto flex flex-col min-h-[90vh]">
        
        {/* Шапка с заголовом */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🎟️ Мои ваучеры</h1>
        </div>
        
        {/* Основной контент */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Загрузка...</div>
          ) : userCards.length === 0 ? (
            <div className="text-center py-20 text-gray-500 flex flex-col items-center gap-4">
              <p>Ваучеров пока нет. Проверьте правильность оплаты.</p>
              <button onClick={() => router.push('/')} className="bg-[#2a2a2a] hover:bg-[#333] px-4 py-2 rounded-xl text-sm transition">
                В каталог
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {userCards.map((item, idx) => (
                <div key={idx} className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2a2a2a] flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.title || item.name || 'Ваучер'}</div>
                    <div className="text-[#07c160] font-bold mt-1">Баланс: {item.balance_rub || item.balance || 0} ₽</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Кнопка СБП внизу страницы */}
        <div className="mt-8 pt-4 border-t border-[#2a2a2a]">
          <button
            onClick={() => router.push('/sbp')}
            className="w-full bg-[#07c160] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#07c160]/20 cursor-pointer"
          >
            <span>💳 Оплатить через СБП (QR-код)</span>
          </button>
        </div>

      </div>
    </div>
  );
}