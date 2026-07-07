'use client';

import { useState, useRef, useCallback } from 'react';
import { Share2, Check, Loader2, Download, X } from 'lucide-react';

interface ShareCardData {
  name: string;
  major: string;
  department: string;
  school?: string;
  totalExp: number;
  level: number;
  tier: string;
  timeProgress: number;
  daysRemaining: number;
  streak: number;
  type: 'home' | 'checkin' | 'certificate' | 'profile' | 'bkk-home' | 'bkk-cert';
  // Optional for certificate
  tier2?: string;
  verificationId?: string;
  // Optional for BKK
  totalInterns?: number;
  certifiedCount?: number;
  avgExp?: number;
}

const SHARE_TEXTS: Record<string, { title: string; subtitle: string; hashtags: string }> = {
  home: {
    title: 'MAGANG BPJS KETENAGAKERJAAN',
    subtitle: 'Cabang Cirebon',
    hashtags: '#MagangBPJS #BPJSKetenagakerjaan #MagangCerdas'
  },
  checkin: {
    title: 'ABSEN MAGANG HARI INI',
    subtitle: 'BPJS Ketenagakerjaan Cabang Cirebon',
    hashtags: '#MagangBPJS #AbsenMagang #BPJSKetenagakerjaan'
  },
  certificate: {
    title: 'SERTIFIKAT MAGANG',
    subtitle: 'BPJS Ketenagakerjaan Cabang Cirebon',
    hashtags: '#MagangBPJS #SertifikatMagang #BPJSKetenagakerjaan'
  },
  profile: {
    title: 'PESERTA MAGANG',
    subtitle: 'BPJS Ketenagakerjaan Cabang Cirebon',
    hashtags: '#MagangBPJS #BPJSKetenagakerjaan'
  },
  'bkk-home': {
    title: 'KERJASAMA MAGANG',
    subtitle: 'BKK × BPJS Ketenagakerjaan',
    hashtags: '#MagangBPJS #BKK #BPJSKetenagakerjaan'
  },
  'bkk-cert': {
    title: 'ARSIP SERTIFIKAT',
    subtitle: 'BKK × BPJS Ketenagakerjaan',
    hashtags: '#SertifikatMagang #BKK #BPJSKetenagakerjaan'
  }
};

export default function ShareButton({ data, label = 'Bagikan', variant = 'default', className = '' }: {
  data: ShareCardData;
  label?: string;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}) {
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCard = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) { resolve(null); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      const W = 1080, H = 1080;
      canvas.width = W;
      canvas.height = H;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0B2C5C');
      bgGrad.addColorStop(0.5, '#1a4a8a');
      bgGrad.addColorStop(1, '#0B2C5C');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Decorative circles
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#F4B41A';
      ctx.beginPath(); ctx.arc(W - 100, 100, 200, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(100, H - 100, 150, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // Top border accent
      const topGrad = ctx.createLinearGradient(0, 0, W, 0);
      topGrad.addColorStop(0, '#F4B41A');
      topGrad.addColorStop(0.5, '#FFD700');
      topGrad.addColorStop(1, '#F4B41A');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, 8);

      // Bottom border
      ctx.fillRect(0, H - 8, W, 8);

      const config = SHARE_TEXTS[data.type] || SHARE_TEXTS.home;
      let y = 80;

      // Title (BPJS)
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#F4B41A';
      ctx.fillText(config.title, W / 2, y);
      y += 28;

      // Subtitle
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#FFFFFFaa';
      ctx.fillText(config.subtitle, W / 2, y);
      y += 50;

      // Name (large)
      ctx.font = 'bold 56px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(data.name, W / 2, y);
      y += 40;

      // Major + Department
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#FFFFFFcc';
      ctx.fillText(`${data.major} • ${data.department}`, W / 2, y);
      y += 30;

      if (data.school) {
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#FFFFFF99';
        ctx.fillText(data.school, W / 2, y);
        y += 30;
      }

      y += 20;

      // Stats cards (3 columns)
      const cardW = 280, cardH = 140, gap = 20;
      const startX = (W - (cardW * 3 + gap * 2)) / 2;
      const stats = [
        { label: 'EXP', value: data.totalExp?.toString() || '0', color: '#F4B41A' },
        { label: 'LEVEL', value: data.level?.toString() || '1', color: '#4FC3F7' },
        { label: 'STREAK', value: `${data.streak || 0} hari`, color: '#FF7043' }
      ];

      if (data.type === 'bkk-home' || data.type === 'bkk-cert') {
        stats[0] = { label: 'PESERTA', value: data.totalInterns?.toString() || '0', color: '#F4B41A' };
        stats[1] = { label: 'SERTIFIKAT', value: data.certifiedCount?.toString() || '0', color: '#4CAF50' };
        stats[2] = { label: 'AVG EXP', value: data.avgExp?.toString() || '0', color: '#4FC3F7' };
      }

      stats.forEach((stat, i) => {
        const x = startX + i * (cardW + gap);
        // Card bg
        ctx.fillStyle = '#FFFFFF15';
        roundRect(ctx, x, y, cardW, cardH, 20);
        ctx.fill();
        // Border
        ctx.strokeStyle = stat.color + '40';
        ctx.lineWidth = 2;
        roundRect(ctx, x, y, cardW, cardH, 20);
        ctx.stroke();
        // Value
        ctx.fillStyle = stat.color;
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stat.value, x + cardW / 2, y + 75);
        // Label
        ctx.fillStyle = '#FFFFFF99';
        ctx.font = '18px sans-serif';
        ctx.fillText(stat.label, x + cardW / 2, y + 110);
      });

      y += cardH + 40;

      // Tier badge
      if (data.tier) {
        ctx.fillStyle = data.tier === 'Excellence' ? '#F4B41A' : data.tier === 'Competent' ? '#4CAF50' : '#9E9E9E';
        roundRect(ctx, W / 2 - 200, y, 400, 60, 30);
        ctx.fill();
        ctx.fillStyle = '#0B2C5C';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(`🏆 TIER: ${data.tier.toUpperCase()}`, W / 2, y + 40);
        y += 80;
      }

      // Verification ID (for certificate)
      if (data.verificationId) {
        ctx.fillStyle = '#FFFFFF80';
        ctx.font = '18px monospace';
        ctx.fillText(`Verify: ${data.verificationId}`, W / 2, y);
        y += 30;
      }

      // Progress bar
      if (data.timeProgress !== undefined) {
        const barW = 600, barH = 12;
        const barX = (W - barW) / 2;
        ctx.fillStyle = '#FFFFFF20';
        roundRect(ctx, barX, y, barW, barH, 6);
        ctx.fill();
        ctx.fillStyle = '#4FC3F7';
        roundRect(ctx, barX, y, barW * (data.timeProgress / 100), barH, 6);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF99';
        ctx.font = '16px sans-serif';
        ctx.fillText(`${data.timeProgress}% selesai • ${data.daysRemaining} hari tersisa`, W / 2, y + 35);
        y += 50;
      }

      // Hashtags
      y = H - 80;
      ctx.fillStyle = '#F4B41A99';
      ctx.font = '18px sans-serif';
      ctx.fillText(config.hashtags, W / 2, y);

      y += 30;
      ctx.fillStyle = '#FFFFFF66';
      ctx.font = '14px sans-serif';
      ctx.fillText('magang-cerdas-pwa.vercel.app', W / 2, y);

      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
    });
  }, [data]);

  const handleShare = async () => {
    setLoading(true);
    try {
      const blob = await generateCard();
      if (!blob) { setLoading(false); return; }

      const file = new File([blob], 'magang-bpjs.png', { type: 'image/png' });
      const config = SHARE_TEXTS[data.type] || SHARE_TEXTS.home;
      const shareText = `${config.title}\n${data.name}\n${data.major} • ${data.department}\n\n⚡ ${data.totalExp} EXP • Level ${data.level}\n🏆 Tier: ${data.tier}\n\n${config.hashtags}`;

      // Web Share API with files (image + text)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: config.title,
          text: shareText,
          files: [file]
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else if (navigator.share) {
        // Fallback: share text only + download image
        await navigator.share({ title: config.title, text: shareText });
        // Also download image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'magang-bpjs.png';
        a.click();
        URL.revokeObjectURL(url);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        // Fallback: show modal with image + WhatsApp
        setShowModal(true);
      }
    } catch (err) {
      // User cancelled — ignore
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppFallback = async () => {
    const blob = await generateCard();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'magang-bpjs.png';
    a.click();
    URL.revokeObjectURL(url);

    const config = SHARE_TEXTS[data.type] || SHARE_TEXTS.home;
    const text = encodeURIComponent(`${config.title}\n${data.name}\n${data.major} • ${data.department}\n\n⚡ ${data.totalExp} EXP • Level ${data.level}\n🏆 Tier: ${data.tier}\n\n${config.hashtags}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowModal(false);
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  };

  // Hidden canvas for rendering
  const canvasEl = <canvas ref={canvasRef} style={{ display: 'none' }} />;

  // Modal for fallback (download + WhatsApp)
  const modal = showModal && (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Bagikan Prestasi</h3>
          <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} className="max-w-full max-h-[300px] rounded-xl" style={{ display: 'block' }} />
        </div>
        <p className="text-xs text-gray-500 mb-4 text-center">Gambar card prestasi sudah diunduh. Bagikan ke WhatsApp dengan teks di bawah:</p>
        <button onClick={handleWhatsAppFallback} className="w-full bg-bpjs-green text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <Share2 className="w-5 h-5" /> Buka WhatsApp
        </button>
        <p className="text-[10px] text-gray-400 mt-2 text-center">Tip: lampirkan gambar yang baru diunduh ke chat WhatsApp</p>
      </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <>
        {canvasEl}
        {modal}
        <button onClick={handleShare} disabled={loading} className={`p-2 rounded-lg transition-all ${shared ? 'bg-bpjs-green text-white' : 'bg-white/10 hover:bg-white/20 text-white/80'} ${className}`} title={label}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        </button>
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        {canvasEl}
        {modal}
        <button onClick={handleShare} disabled={loading} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${shared ? 'bg-bpjs-green/20 border-bpjs-green/40 text-bpjs-green' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'} ${className}`}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          {shared ? 'Tersimpan!' : label}
        </button>
      </>
    );
  }

  return (
    <>
      {canvasEl}
      {modal}
      <button onClick={handleShare} disabled={loading} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${shared ? 'bg-bpjs-green text-white' : 'bg-bpjs-yellow/20 hover:bg-bpjs-yellow/30 text-bpjs-yellow border border-bpjs-yellow/30'} ${className}`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        {shared ? 'Berhasil dibagikan!' : label}
      </button>
    </>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
