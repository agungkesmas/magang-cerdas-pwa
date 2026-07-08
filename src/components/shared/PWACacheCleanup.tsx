'use client';

import { useEffect } from 'react';

/**
 * PWACacheCleanup (SILENT VERSION)
 *
 * Versi lama: tampilkan banner kuning besar yang panikkan user.
 * Versi ini: jalankan cleanup secara SILENT di background, tanpa UI.
 *
 * Strategi:
 * 1. Detect cache 'apis' lama di background (tidak tampilkan apa-apa)
 * 2. Kalau ada, silently unregister SW lama + clear cache 'apis'
 * 3. JANGAN reload halaman (anti-panik)
 * 4. Next page load akan otomatis pakai SW baru (config NetworkOnly API)
 *
 * Cleanup ini hanya perlu jalan sekali — begitu SW baru terinstall,
 * cache 'apis' tidak akan pernah terisi lagi (karena NetworkOnly).
 *
 * Komponen ini return null — tidak render apa-apa di layar.
 */
export default function PWACacheCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Tidak ada SW → tidak perlu cleanup
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
      return;
    }

    const silentCleanup = async () => {
      try {
        const cacheNames = await caches.keys();
        const hasOldApiCache = cacheNames.includes('apis');

        // Hanya cleanup kalau ada cache 'apis' lama (indikasi SW lama)
        if (!hasOldApiCache) {
          return;
        }

        console.info('[PWA] Cleaning up stale API cache (silent)...');

        // 1. Hapus cache 'apis' saja (jangan sentuh cache lain)
        await caches.delete('apis');

        // 2. Unregister SW lama supaya SW baru bisa take over di next load
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }

        console.info('[PWA] Stale cache cleaned. SW will re-register on next load.');

        // TIDAK reload halaman — anti-panik.
        // SWUpdateListener sudah handle auto-reload kalau SW baru activate.
        // User tidak akan sadar apa-apa terjadi.
      } catch (e) {
        // Silent fail — jangan ganggu user
        console.warn('[PWA] Silent cleanup failed (not critical):', e);
      }
    };

    // Delay 2 detik supaya tidak block initial render
    const timer = setTimeout(silentCleanup, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Tidak render apa-apa — komponen ini invisible
  return null;
}
