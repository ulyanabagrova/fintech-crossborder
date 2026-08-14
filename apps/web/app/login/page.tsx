'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Введите ваш email');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Отправляем запрос на наш бэкенд (/api/v1/auth/login)
      const res: any = await request('/auth/login', 'POST', { 
        email: email.trim().toLowerCase() 
      });

      const userId = res?.user?.id || res?.userId || res?.id;
      const accessToken = res?.accessToken || res?.token;

      if (!userId) {
        throw new Error('Не удалось получить ID пользователя с сервера');
      }

      // Сохраняем данные сессии
      localStorage.setItem('userId', userId);
      localStorage.setItem('userEmail', email.trim());
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }

      // Перенаправляем на главную страницу после успешного входа
      router.push('/');
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      setErrorMsg(error?.message || 'Ошибка авторизации. Проверьте подключение к бэкенду.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white flex flex-col justify-center items-center p-4 box-border">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#2a2a2a] p-8 rounded-2xl shadow-2xl flex flex-col gap-6">
        
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 tracking-tight">Добро пожаловать</h1>
          <p className="text-gray-400 text-sm">
            Введите email для входа в систему и доступа к сервису
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Электронная почта</label>
            <input
              type="email"
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
            className="w-full bg-[#07c160] text-white font-bold rounded-xl py-3 text-sm hover:opacity-90 transition disabled:opacity-50 cursor-pointer mt-2 shadow-lg shadow-[#07c160]/20"
          >
            {loading ? 'Выполняется вход...' : 'Войти в систему'}
          </button>
        </form>

      </div>
    </div>
  );
}