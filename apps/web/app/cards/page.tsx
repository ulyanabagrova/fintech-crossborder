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
    
    // Очищаем userId от лишних кавычек, если они есть
    const cleanUserId = rawUserId.replace(/['"]/g, '');
    loadUserCards(cleanUserId);
  }, [router]);

  async function loadUserCards(userId: string) {
    setLoading(true);
    try {
      // Пытаемся получить данные
      let res = await request(`/cards/purchased?userId=${encodeURIComponent(userId)}`, 'GET');
      
      // Если пусто, пробуем еще один вариант: если userId содержит "user_", попробуем без него
      if ((!res || (Array.isArray(res) && res.length === 0)) && userId.startsWith('user_')) {
        const altUserId = userId.replace('user_', '');
        console.log('🔄 [MyCards] Первый запрос пуст, пробуем альтернативный ID:', altUserId);
        res = await request(`/cards/purchased?userId=${encodeURIComponent(altUserId)}`, 'GET');
      }

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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🎟️ Мои ваучеры</h1>
        
        {loading ? (
          <div className="text-center py-20 text-gray-500">Загрузка...</div>
        ) : userCards.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>Ваучеров пока нет. Проверьте правильность оплаты.</p>
            <button onClick={() => router.push('/')} className="mt-4 bg-[#2a2a2a] px-4 py-2 rounded">В каталог</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {userCards.map((item, idx) => (
              <div key={idx} className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2a2a2a]">
                <div className="font-bold">{item.title || item.name || 'Ваучер'}</div>
                <div className="text-[#07c160] font-bold">Баланс: {item.balance_rub || item.balance || 0} ₽</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}