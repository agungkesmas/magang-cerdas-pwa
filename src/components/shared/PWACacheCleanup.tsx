'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * PWA Cache Cleanup Component
 *
 * Masalah: Service Worker lama cache API response selama 24 jam.
 * User lihat data stale walaupun server sudah return data baru.
 *
 * Solusi: Komponen ini auto-detect kalau ada SW lama & clear cache.
 * Hanya tampil di admin (bisa diakses di /admin/pwa-cleanup atau
 * auto-run di admin layout).
 *
 * Setelah deploy fix PWA config, komponen ini akan:
 * 1. Unregister SW lama
 * 2. Clear semua cache (pages, apis, dll)
 * 3. Reload halaman supaya SW baru (dengan config NetworkOnly untuk API) terinstall
 */
export default function PWACacheCleanup() {
  const [status, setStatus] = useState<'idle' | 'cleaning' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Cek apakah perlu cleanup — kalau ada cache 'apis' yang berisi API response lama
    const checkAndCleanup = async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('caches' in window)) {
        return;
      }

      try {
        const cacheNames = await caches.keys();
        const hasApiCache = cacheNames.includes('apis');
        const hasOldPagesCache = cacheNames.includes('pages');

        // Kalau ada cache 'apis' (yang seharusnya tidak ada di SW baru), perlu cleanup
        if (hasApiCache) {
          setShowBanner(true);
        }
      } catch (e) {
        console.warn('[PWA Cleanup] check failed:', e);
      }
    };

    checkAndCleanup();
  }, []);

  const doCleanup = async () => {
    setStatus('cleaning');
    setMessage('Membersihkan cache lama...');

    try {
      // 1. Unregister semua SW lama
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
          console.log('[PWA Cleanup] SW unregistered:', reg.scope);
        }
      }

      // 2. Clear semua cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
          console.log('[PWA Cleanup] Cache deleted:', name);
        }
      }

      // 3. Clear localStorage & sessionStorage untuk reset PWA state
      // (Tidak hapus auth tokens — biarkan user tetap login)
      const authKeys = ['magang_admin_token', 'magang_intern_token', 'magang_bkk_token', 'magang_pembina_token'];
      const savedAuth: Record<string, string> = {};
      authKeys.forEach(k => {
        const v = localStorage.getItem(k);
        if (v) savedAuth[k] = v;
      });

      localStorage.clear();
      sessionStorage.clear();

      // Restore auth tokens
      Object.entries(savedAuth).forEach(([k, v]) => localStorage.setItem(k, v));

      setStatus('done');
      setMessage('Cache berhasil dibersihkan! Halaman akan reload otomatis...');

      // 4. Reload setelah 1.5 detik supaya SW baru (dengan config NetworkOnly) terinstall
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      setStatus('error');
      setMessage('Gagal cleanup: ' + e.message);
    }
  };

  if (!showBanner && status === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-xl shadow-2xl border-2 border-amber-400 p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-sm">Cache PWA Perlu Diperbarui</h3>
          <p className="text-xs text-gray-600 mt-1">
            Kami mendeteksi cache lama yang menyimpan data stale. Klik tombol di bawah
            untuk membersihkan cache & reload halaman dengan versi terbaru.
          </p>

          {status === 'done' && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="mt-2 text-xs text-red-600">{message}</div>
          )}

          {status !== 'cleaning' && status !== 'done' && (
            <button
              onClick={doCleanup}
              className="mt-3 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Bersihkan Cache
            </button>
          )}

          {status === 'cleaning' && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {message}
            </div>
          )}

          {status === 'idle' && (
            <button
              onClick={() => setShowBanner(false)}
              className="mt-2 text-[10px] text-gray-400 hover:text-gray-600"
            >
              Tutup (nanti)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
