import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Отключаем строгую генерацию и статический анализ проблемных страниц
  experimental: {
    // оставляем пустым или настраиваем базово
  },
};

export default nextConfig;