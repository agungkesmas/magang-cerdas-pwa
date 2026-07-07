'use client';

import { useEffect, useState } from 'react';

export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const [showBlurOverlay, setShowBlurOverlay] = useState(false);

  useEffect(() => {
    let securityEnabled = true;
    let maintenanceCheckInterval: any = null;

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
              securityEnabled = false;
              removeSecurity();
              return;
            }
          }
        }
        securityEnabled = true;
        applySecurity();
      } catch {
        securityEnabled = true;
        applySecurity();
      }
    };

    const isEnvMaintenance = process.env.NEXT_PUBLIC_DISABLE_SECURE_MODE === 'true';
    if (isEnvMaintenance) {
      securityEnabled = false;
      return;
    }

    const applySecurity = () => {
      if (!securityEnabled) return;
      document.body.classList.add('secure-mode');
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCut);
      document.addEventListener('selectstart', handleSelectStart);
      document.addEventListener('dragstart', handleDragStart);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
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
        setShowBlurOverlay(true);
        setTimeout(() => setShowBlurOverlay(false), 2000);
      }
    };
    const handleCopy = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault(); return false;
    };
    const handleCut = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault(); return false;
    };
    const handleSelectStart = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault(); return false;
    };
    const handleDragStart = (e: DragEvent) => { e.preventDefault(); return false; };
    const handleWindowBlur = () => { setShowBlurOverlay(true); };
    const handleWindowFocus = () => { setShowBlurOverlay(false); };
    const handleVisibilityChange = () => {
      if (document.hidden) { setShowBlurOverlay(true); } else { setShowBlurOverlay(false); }
    };

    checkMaintenance();
    maintenanceCheckInterval = setInterval(checkMaintenance, 5 * 60 * 1000);

    return () => {
      removeSecurity();
      if (maintenanceCheckInterval) clearInterval(maintenanceCheckInterval);
    };
  }, []);

  return (
    <>
      {children}
      {showBlurOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center" style={{ backdropFilter: 'blur(20px)' }}>
          <div className="text-center">
            <p className="text-white text-lg font-bold mb-2">🔒 Konten Terlindungi</p>
            <p className="text-white/60 text-sm">Konten ini tidak dapat di-screenshot atau disalin.</p>
          </div>
        </div>
      )}
    </>
  );
}
