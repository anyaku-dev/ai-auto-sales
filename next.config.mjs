/** @type {import('next').NextConfig} */
const nextConfig = {
  // タイムアウト設定を延長（Vercel Proなどを使う場合用）
  maxDuration: 60,
  
  // ライブラリのバンドル設定（ここが重要！）
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  },
};

export default nextConfig;