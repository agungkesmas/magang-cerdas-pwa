'use client';

import { useEffect, useState } from 'react';

<<<<<<< HEAD
/**
 * SecurityWrapper — Client component untuk disable screenshot & text copy
 * Untuk dashboard Peserta Magang & BKK
 *
 * FITUR (diperkuat):
 * 1. CSS: user-select none, -webkit-touch-callout none, img drag disabled
 * 2. Block context menu (right-click / long-press)
 * 3. Block keyboard: Ctrl+P/S/U/A/C/X, Ctrl+Shift+C/I/J, F12, PrtScn
 * 4. Block copy, cut, selectstart, dragstart events
 * 5. PrtScn detection: clear clipboard on keyup
 * 6. Window blur detection: overlay black screen (anti screenshot tool)
 * 7. Visibility change: blur content when tab hidden
 * 8. Maintenance mode: 30 menit window via API check
 *
 * Mode maintenance:
 * - Cek /api/settings/get setiap 5 menit
 * - Kalau maintenance_active=true & dalam 30 menit window → disable security
 * - Otomatis re-enable setelah 30 menit
 * - Juga cek env var NEXT_PUBLIC_DISABLE_SECURE_MODE untuk debug
 */
=======
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const [showBlurOverlay, setShowBlurOverlay] = useState(false);

  useEffect(() => {
    let securityEnabled = true;
    let maintenanceCheckInterval: any = null;

<<<<<<< HEAD
    // Check maintenance mode via API
=======
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/settings/get');
        const data = await res.json();
        if (data.success && data.settings?.maintenance_active === true) {
          const startTime = data.settings.maintenance_started_at;
          if (startTime) {
            const elapsed = Date.now() - new Date(startTime).getTime();
            const thirtyMins = 30 * 60 * 1000;
            if (elapsed < thirtyMins) {
<<<<<<< HEAD
              // Maintenance active, within 30 min window
=======
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
              securityEnabled = false;
              removeSecurity();
              return;
            }
          }
        }
<<<<<<< HEAD
        // Maintenance not active or expired — enable security
        securityEnabled = true;
        applySecurity();
      } catch {
        // API error — keep security on (fail-safe)
=======
        securityEnabled = true;
        applySecurity();
      } catch {
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
        securityEnabled = true;
        applySecurity();
      }
    };

<<<<<<< HEAD
    // Also check env var for local debug
=======
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
    const isEnvMaintenance = process.env.NEXT_PUBLIC_DISABLE_SECURE_MODE === 'true';
    if (isEnvMaintenance) {
      securityEnabled = false;
      return;
    }

<<<<<<< HEAD
    // === SECURITY FUNCTIONS ===

    const applySecurity = () => {
      if (!securityEnabled) return;
      document.body.classList.add('secure-mode');

      // Block context menu
      document.addEventListener('contextmenu', handleContextMenu);

      // Block keyboard shortcuts
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      // Block copy/cut/selectstart/dragstart
=======
    const applySecurity = () => {
      if (!securityEnabled) return;
      document.body.classList.add('secure-mode');
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCut);
      document.addEventListener('selectstart', handleSelectStart);
      document.addEventListener('dragstart', handleDragStart);
<<<<<<< HEAD

      // Window blur (potential screenshot tool / alt-tab)
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);

      // Visibility change (tab switch)
=======
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
      document.addEventListener('visibilitychange', handleVisibilityChange);
    };

    const removeSecurity = () => {
      document.body.classList.remove('secure-mode');
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setShowBlurOverlay(false);
    };

<<<<<<< HEAD
    // === HANDLERS ===

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // Block: Ctrl+P (print), Ctrl+S (save), Ctrl+U (view source), Ctrl+A (select all)
      if (ctrl && ['p', 's', 'u', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault(); return false;
      }
      // Block: Ctrl+C (copy), Ctrl+X (cut) — except in input/textarea
      if (ctrl && ['c', 'x'].includes(e.key.toLowerCase())) {
        const t = e.target as HTMLElement;
        if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') {
          e.preventDefault(); return false;
        }
      }
      // Block: Ctrl+Shift+C/I/J (devtools), Ctrl+Shift+S (save as)
      if (ctrl && e.shiftKey && ['c', 'i', 'j', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault(); return false;
      }
      // Block: F12 (devtools)
      if (e.key === 'F12') { e.preventDefault(); return false; }
      // Block: PrintScreen (keydown — also handle on keyup)
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        try { navigator.clipboard?.writeText(''); } catch {}
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // PrtScn: clear clipboard on keyup (more reliable than keydown)
      if (e.key === 'PrintScreen') {
        try { navigator.clipboard?.writeText(''); } catch {}
        // Show warning
=======
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); return false; };
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ['p', 's', 'u', 'a'].includes(e.key.toLowerCase())) { e.preventDefault(); return false; }
      if (ctrl && ['c', 'x'].includes(e.key.toLowerCase())) {
        const t = e.target as HTMLElement;
        if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') { e.preventDefault(); return false; }
      }
      if (ctrl && e.shiftKey && ['c', 'i', 'j', 's'].includes(e.key.toLowerCase())) { e.preventDefault(); return false; }
      if (e.key === 'F12') { e.preventDefault(); return false; }
      if (e.key === 'PrintScreen') { e.preventDefault(); try { navigator.clipboard?.writeText(''); } catch {} return false; }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        try { navigator.clipboard?.writeText(''); } catch {}
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
        setShowBlurOverlay(true);
        setTimeout(() => setShowBlurOverlay(false), 2000);
      }
    };
<<<<<<< HEAD

=======
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
    const handleCopy = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault(); return false;
    };
<<<<<<< HEAD

=======
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
    const handleCut = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault(); return false;
    };
<<<<<<< HEAD

=======
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
    const handleSelectStart = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault(); return false;
    };
<<<<<<< HEAD

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault(); return false;
    };

    const handleWindowBlur = () => {
      // When window loses focus (alt-tab, screenshot tool), show black overlay
      setShowBlurOverlay(true);
    };

    const handleWindowFocus = () => {
      setShowBlurOverlay(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowBlurOverlay(true);
      } else {
        setShowBlurOverlay(false);
      }
    };

    // Initial check
    checkMaintenance();

    // Check maintenance every 5 minutes
    maintenanceCheckInterval = setInterval(checkMaintenance, 5 * 60 * 1000);

    // Cleanup
=======
    const handleDragStart = (e: DragEvent) => { e.preventDefault(); return false; };
    const handleWindowBlur = () => { setShowBlurOverlay(true); };
    const handleWindowFocus = () => { setShowBlurOverlay(false); };
    const handleVisibilityChange = () => {
      if (document.hidden) { setShowBlurOverlay(true); } else { setShowBlurOverlay(false); }
    };

    checkMaintenance();
    maintenanceCheckInterval = setInterval(checkMaintenance, 5 * 60 * 1000);

>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
    return () => {
      removeSecurity();
      if (maintenanceCheckInterval) clearInterval(maintenanceCheckInterval);
    };
  }, []);

  return (
    <>
      {children}
<<<<<<< HEAD
      {/* Blur overlay — shown when window loses focus or PrtScn detected */}
      {showBlurOverlay && (
        <div
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          style={{ backdropFilter: 'blur(20px)' }}
        >
=======
      {showBlurOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center" style={{ backdropFilter: 'blur(20px)' }}>
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
          <div className="text-center">
            <p className="text-white text-lg font-bold mb-2">🔒 Konten Terlindungi</p>
            <p className="text-white/60 text-sm">Konten ini tidak dapat di-screenshot atau disalin.</p>
          </div>
        </div>
      )}
    </>
  );
}
