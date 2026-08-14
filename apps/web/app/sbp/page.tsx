'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';

export default function SbpPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [amount, setAmount] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    const rawUserId = localStorage.getItem('userId');
    if (!rawUserId) {
      router.push('/login');
      return;
    }
  }, [router]);

  async function handleProcessPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!qrCodeData.trim() || !amount.trim()) {
      alert('Заполните данные QR-кода и сумму');
      return;
    }

    setLoading(true);
    setSuccessMsg(false);

    const rawUserId = localStorage.getItem('userId');
    const cleanUserId = rawUserId ? rawUserId.replace(/['"]/g, '') : '';

    try {
      // Отправляем запрос на списание средств с ваучера/карты пользователя по скану кассового QR
      const res: any = await request('/cards/pay-by-qr', 'POST', {
        userId: cleanUserId,
        qrData: qrCodeData.trim(),
        amount: Number(amount),
      });

      if (res?.success || res?.status === 'ok') {
        setSuccessMsg(true);
        setTimeout(() => {
          router.push('/my-cards');
        }, 2000);
      } else {
        throw new Error(res?.message || 'Ошибка списания');
      }
    } catch (err: any) {
      console.error('❌ [SBP Pay] Ошибка:', err);
      alert(err?.message || 'Не удалось провести оплату. Проверьте баланс ваучера.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white p-4">
      <div className="max-w-2xl mx-auto flex flex-col min-h-[90vh]">
        
        {/* Шапка с заголовом */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">📷 Оплата по QR-коду</h1>
          <button 
            onClick={() => router.back()} 
            className="bg-[#2a2a2a] hover:bg-[#333] px-3 py-1.5 rounded-xl text-xs transition text-gray-300"
          >
            Назад
          </button>
        </div>
        
        {/* Основной контент */}
        <div className="flex-1 flex flex-col justify-center">
          {successMsg ? (
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] p-8 rounded-2xl flex flex-col items-center text-center gap-4 shadow-xl">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-bold text-[#07c160]">Оплата успешно прошла!</h2>
              <p className="text-sm text-gray-400">Средства списаны с вашего ваучера. Перенаправляем...</p>
            </div>
          ) : (
            <form onSubmit={handleProcessPayment} className="bg-[#1e1e1e] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
              <div className="text-center mb-2">
                <p className="text-sm text-gray-400">
                  Сканируйте QR-код на кассе или введите его данные вручную для списания с вашего ваучера.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 uppercase font-semibold">Данные QR-кода / Ссылка кассы</label>
                <input
                  type="text"
                  value={qrCodeData}
                  onChange={(e) => setQrCodeData(e.target.value)}
                  placeholder="Отсканируйте камеррой или вставьте текст QR"
                  className="bg-[#121212] border border-[#333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#07c160] transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 uppercase font-semibold">Сумма списания (₽)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="bg-[#121212] border border-[#333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#07c160] transition"
                  required
                  min="1"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#07c160] text-white font-bold rounded-xl py-3 text-sm hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-[#07c160]/20 mt-2"
              >
                {loading ? 'Обработка платежа...' : 'Подтвердить списание'}
              </button>
            </form>
          )}
        </div>

        {/* Кнопка возврата внизу */}
        <div className="mt-8 pt-4 border-t border-[#2a2a2a]">
          <button
            onClick={() => router.push('/my-cards')}
            className="w-full bg-[#2a2a2a] hover:bg-[#333] text-gray-300 font-medium py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🎟️ К моим ваучерам</span>
          </button>
        </div>

      </div>
    </div>
  );
}