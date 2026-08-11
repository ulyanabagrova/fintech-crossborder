import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Отключаем строгую генерацию статики для избежания багов пререндеринга
  output: "standalone",
};

export default nextConfig;