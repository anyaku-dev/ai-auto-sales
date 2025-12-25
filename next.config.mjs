/** @type {import('next').NextConfig} */
const nextConfig = {  
  // ★ここが重要：最新ライブラリを動かす設定
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  },
};

export default nextConfig;