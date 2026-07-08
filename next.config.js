const withPWAInit = require('@ducanh2912/next-pwa').default;

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontendNav: true,
  aggressiveFrontEndNavCaching: false, // disable aggressive caching — cause API cache stuck
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // ============================================================
      // CRITICAL: JANGAN cache API routes — selalu fetch dari network
      // Bug lama: aggressiveFrontEndNavCaching=true + default Workbox
      // cache API /api/groups/list dll selama 24 jam. Akibatnya user
      // lihat data stale (grup lama) walaupun server sudah return data baru.
      // ============================================================
      {
        urlPattern: /\/api\/.*/i,
        handler: 'NetworkOnly', // JANGAN cache API — selalu network
      },
      // Start URL — NetworkFirst supaya kalau online, selalu ambil terbaru
      {
        urlPattern: /^\/$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'start-url',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 1, maxAgeSeconds: 300 } // 5 menit saja
        }
      },
      // Static JS chunks — CacheFirst (hashed filenames, aman di-cache lama)
      {
        urlPattern: /\/_next\/static\/.+\.js$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static-js-assets',
          expiration: { maxEntries: 64, maxAgeSeconds: 86400 }
        }
      },
      // Static CSS — StaleWhileRevalidate
      {
        urlPattern: /\.(?:css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-style-assets',
          expiration: { maxEntries: 32, maxAgeSeconds: 86400 }
        }
      },
      // Images — StaleWhileRevalidate
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-image-assets',
          expiration: { maxEntries: 64, maxAgeSeconds: 2592000 }
        }
      },
      // Fonts Google
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-webfonts',
          expiration: { maxEntries: 4, maxAgeSeconds: 31536000 }
        }
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'google-fonts-stylesheets',
          expiration: { maxEntries: 4, maxAgeSeconds: 604800 }
        }
      },
      // ============================================================
      // HALAMAN AUTHENTICATED (admin/pembina/bkk/intern) — NetworkOnly
      // JANGAN cache halaman yang butuh login. Penyebab bug "grup
      // Pemasaran & Keuangan hilang": SW cache halaman lama, user lihat
      // versi stale walau server sudah return data baru.
      // ============================================================
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin &&
          (url.pathname.startsWith('/admin') ||
           url.pathname.startsWith('/pembina') ||
           url.pathname.startsWith('/bkk') ||
           url.pathname.startsWith('/intern')),
        handler: 'NetworkOnly'
      },
      // ============================================================
      // HALAMAN PUBLIK (landing, login, staff-access) — NetworkFirst TTL 5 menit
      // ============================================================
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin &&
          !url.pathname.startsWith('/api/') &&
          !url.pathname.startsWith('/admin') &&
          !url.pathname.startsWith('/pembina') &&
          !url.pathname.startsWith('/bkk') &&
          !url.pathname.startsWith('/intern'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-public',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 16, maxAgeSeconds: 300 }
        }
      }
    ]
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ktfyzoowgxvllwauqpir.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }
    ]
  },
  experimental: { serverActions: { bodySizeLimit: '10mb' } }
};

module.exports = withPWA(nextConfig);
