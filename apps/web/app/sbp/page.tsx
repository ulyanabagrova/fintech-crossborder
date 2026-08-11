'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';

export default function SbpPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState('');
  const [amount, setAmount] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }
    loadCards(userId);
  }, []);

  async function loadCards(userId: string) {
    try {
      // Загружаем только активные карты
      const res = await request(`/cards/purchased?userId=${userId}`, 'GET');
      const items = Array.isArray(res) ? res : (res.data || res.items || []);
      setCards(items.filter((c: any) => c.status === 'ACTIVE' || !c.status));
    } catch (e) {
      console.error('Ошибка загрузки карт:', e);
    }
  }

  async function handlePayment() {
    if (!store || !amount) return alert('Заполните данные магазина и сумму');
    if (!selectedCardId) return alert('Выберите карту для оплаты');

    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      await request('/sbp/pay-qr', 'POST', {
        userId,
        store,
        amount: Number(amount),
        cardId: selectedCardId
      });
      
      alert('Успешно оплачено!');
      router.push('/cards');
    } catch (e: any) {
      alert(e.message || 'Ошибка оплаты');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Оплата по QR</h1>
      
      <div className="flex flex-col gap-4 max-w-md mx-auto">
        <input 
          placeholder="Название магазина" 
          className="bg-[#1e1e1e] p-3 rounded-lg border border-[#333]"
          value={store}
          onChange={(e) => setStore(e.target.value)}
        />
        <input 
          type="number"
          placeholder="Сумма (₽)" 
          className="bg-[#1e1e1e] p-3 rounded-lg border border-[#333]"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <select 
          className="bg-[#1e1e1e] p-3 rounded-lg border border-[#333] text-white"
          onChange={(e) => setSelectedCardId(e.target.value)}
        >
          <option value="">Выберите карту для списания</option>
          {cards.map(c => (
            <option key={c.id} value={c.id}>{c.title || 'Карта'} ({c.balance || 0} ₽)</option>
          ))}
        </select>

        <button 
          onClick={handlePayment}
          disabled={loading}
          className="bg-[#07c160] py-3 rounded-full font-bold mt-4 hover:opacity-80"
        >
          {loading ? 'Обработка...' : 'Подтвердить оплату'}
        </button>
      </div>
    </div>
  );
}