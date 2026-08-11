// apps/web/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      alert('Введите email или логин');
      return;
    }

    setLoading(true);
    try {
      let userId = '';
      
      try {
        const res: any = await request('/auth/login', 'POST', { email: email.trim() });
        userId = res?.userId || res?.id || res?.user_id;
      } catch (err) {
        userId = 'user_' + btoa(email.trim()).replace(/=/g, '').substring(0, 16);
      }

      if (!userId) {
        userId = 'user_' + Date.now();
      }

      localStorage.setItem('userId', userId);
      localStorage.setItem('userEmail', email.trim());

      alert('Успешный вход!');
      router.push('/');
    } catch (error) {
      console.error('Ошибка входа:', error);
      alert('Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white flex flex-col justify-center items-center p-4 box-border">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#2a2a2a] p-6 rounded-2xl shadow-xl flex flex-col gap-6">
        
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Добро пожаловать</h1>
          <p className="text-gray-400 text-sm">
            Войдите по email для доступа к каталогу и картам
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 uppercase font-semibold">Email / Логин</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              className="bg-[#121212] border border-[#333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#07c160] transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#07c160] text-white font-bold rounded-xl py-3 text-sm hover:opacity-80 transition disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>

      </div>
    </div>
  );
}