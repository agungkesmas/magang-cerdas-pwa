'use client';

import { useState } from 'react';
import { Share2, Check, Loader2 } from 'lucide-react';

interface ShareData {
  title: string;
  text: string;
  url?: string;
}

interface Props {
  data: ShareData;
  variant?: 'default' | 'compact' | 'card';
  label?: string;
  className?: string;
}

/**
 * ShareButton — tombol berbagi prestasi peserta magang
 * 
 * Pakai Web Share API (native share sheet) kalau tersedia (mobile/WhatsApp/Telegram/dll)
 * Fallback ke WhatsApp URL + copy link kalau Web Share tidak tersedia
 * 
 * Variants:
 * - default: tombol penuh dengan icon + label
 * - compact: hanya icon
 * - card: untuk dipasang di card (border + bg)
 */
export default function ShareButton({ data, variant = 'default', label = 'Bagikan', className = '' }: Props) {
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const fullText = `${data.text}${data.url ? '\n\n${data.url}' : ''}`;

      // Web Share API (native share sheet — WhatsApp, Telegram, Instagram, dll)
      if (navigator.share) {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        // Fallback: WhatsApp
        const waText = encodeURIComponent(fullText);
        window.open(`https://wa.me/?text=${waText}`, '_blank');
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      }
    } catch (err) {
      // User cancel share — bukan error, abaikan
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleShare}
        disabled={loading}
        className={`p-2 rounded-lg transition-all ${shared ? 'bg-bpjs-green text-white' : 'bg-white/10 hover:bg-white/20 text-white/80'} ${className}`}
        title={label}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      </button>
    );
  }

  if (variant === 'card') {
    return (
      <button
        onClick={handleShare}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${shared ? 'bg-bpjs-green/20 border-bpjs-green/40 text-bpjs-green' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'} ${className}`}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
        {shared ? 'Tersimpan!' : label}
      </button>
    );
  }

  // default
  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${shared ? 'bg-bpjs-green text-white' : 'bg-bpjs-yellow/20 hover:bg-bpjs-yellow/30 text-bpjs-yellow border border-bpjs-yellow/30'} ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {shared ? 'Berhasil dibagikan!' : label}
    </button>
  );
}
