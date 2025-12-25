/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14.1.0 では、この書き方が正解です
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  },
};

export default nextConfig;