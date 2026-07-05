'use client';

import { useEffect } from 'react';

/**
 * SecurityWrapper — Client component untuk disable screenshot & text copy
 * Untuk dashboard Peserta Magang & BKK
 *
 * Fitur:
 * 1. Add class 'secure-mode' ke body (CSS handles user-select, img drag, print)
 * 2. Block context menu (right-click / long-press)
 * 3. Block keyboard shortcuts: Ctrl+P (print), Ctrl+S (save), Ctrl+U (view source),
 *    Ctrl+Shift+C (devtools inspect), F12 (devtools)
 * 4. Block screenshot attempts on Android via WebView (limited)
 *
 * Catatan:
 * - Tidak ada cara 100% memblock screenshot di browser web (tidak seperti native app)
 * - CSS user-select:none + contextmenu block adalah maksimal yang bisa dilakukan
 * - Untuk PWA yang di-install di Android, bisa pakai Android WebView FLAG_SECURE
 *   tapi butuh native wrapper (TWA / Capacitor)
 * - Untuk iOS Safari, screenshot TIDAK bisa diblock (limitasi OS)
 * - Mode maintenance: admin bisa disable sementara dengan set env var
 *   NEXT_PUBLIC_DISABLE_SECURE_MODE=1 (untuk debugging)
 */
export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check mode maintenance (debug)
    const isMaintenanceMode = process.env.NEXT_PUBLIC_DISABLE_SECURE_MODE === 'true';
    if (isMaintenanceMode) return;

    // 1. Add secure-mode class to body
    document.body.classList.add('secure-mode');

    // 2. Block context menu (right-click on desktop, long-press on mobile)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 3. Block keyboard shortcuts for print, save, view source, devtools
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P (print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+S (save page)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+C (devtools inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+I (devtools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        return false;
      }
      // Block F12 (devtools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Block PrtSc (Print Screen) — attempt only, not reliable
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        // Clear clipboard (attempt)
        try {
          navigator.clipboard?.writeText('');
        } catch {}
        return false;
      }
    };

    // 4. Block copy event (Ctrl+C on selected text)
    const handleCopy = (e: ClipboardEvent) => {
      // Allow copy in input/textarea (user might need to copy their credentials)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      return false;
    };

    // 5. Block cut event
    const handleCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      return false;
    };

    // 6. Block drag start (prevent drag-and-drop of images/text)
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('dragstart', handleDragStart);

    // Cleanup
    return () => {
      document.body.classList.remove('secure-mode');
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return <>{children}</>;
}
