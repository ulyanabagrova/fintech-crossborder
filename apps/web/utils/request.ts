// apps/web/utils/request.ts
export const BASE_URL = 'https://fintech-crossborder-backend-koe6i30xy-ulyanabagrovas-projects.vercel.app/api/v1';

export async function request(endpoint: string, method = 'GET', data: any = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token && !endpoint.includes('/auth/')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method: method.toUpperCase(),
    headers,
  };

  if (method.toUpperCase() !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || `Ошибка сервера (${response.status})`);
  }

  return result;
}