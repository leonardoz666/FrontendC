/** @type {import('next').NextConfig} */
const { default: withPWAInit, runtimeCaching } = require('@ducanh2912/next-pwa')

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheStartUrl: false,
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /\/api\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'controlae-api-network-only' },
      },
      ...runtimeCaching,
    ],
  },
})

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
