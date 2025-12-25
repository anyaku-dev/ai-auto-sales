/** @type {import('next').NextConfig} */
const nextConfig = {
  // タイムアウト設定
  maxDuration: 60,
  
  // ★ここが重要：最新ライブラリを動かす設定
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  },
};

export default nextConfig;