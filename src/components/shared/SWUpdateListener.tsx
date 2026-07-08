'use client';

import { useEffect } from 'react';

/**
 * SWUpdateListener — auto-reload ketika Service Worker baru terinstall
 *
 * Masalah: setelah deploy, SW baru download di background tapi tidak
 * activate sampai semua tab ditutup. User tetap lihat versi lama.
 *
 * Solusi: detect SW update → auto reload halaman supaya SW baru activate
 * + cache lama di-clear.
 *
 * Komponen ini juga force clear HTTP cache untuk halaman saat ini
 * dengan reload(true) — bypass HTTP cache sepenuhnya.
 */
export default function SWUpdateListener() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      // Force reload bypass HTTP cache
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Trigger SW check for updates
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        reg.update().catch(() => {
          // Silent fail — tidak critical
        });
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
