'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X, Clock, MapPin, Shield, Briefcase } from 'lucide-react';

interface Props {
  /** Nama peserta */
  name: string;
  /** Trigger: 'home' (buka app) atau 'checkin' (setelah check-in) */
  trigger: 'home' | 'checkin';
  /** Optional: EXP yang baru didapat (untuk checkin trigger) */
  expGained?: number;
}

const WELCOME_MESSAGES = [
  {
    icon: Briefcase,
    title: 'Selamat Datang Kembali!',
    text: 'Hari baru, semangat baru! Jangan lupa check-in dulu sebelum mulai kerja. Tetap semangat, kamu sedang membangun masa depan di BPJS Ketenagakerjaan! 💪',
    color: 'from-bpjs-blue to-bpjs-blue-dark',
    duration: 5000
  },
  {
    icon: Shield,
    title: 'Tahukah Kamu?',
    text: 'BPJS Ketenagakerjaan melindungi pekerja melalui 4 program: JKK (kecelakaan kerja), JKM (kematian), JHT (hari tua), dan JP (pensiun). Kamu sedang magang di lembaga yang melindungi jutaan pekerja Indonesia! 🏛️',
    color: 'from-bpjs-green to-bpjs-green-dark',
    duration: 6000
  },
  {
    icon: Sparkles,
    title: 'Tips Hari Ini',
    text: 'Kerjakan quest dari pembina lewat menu Aktivitas — cuma butuh 2 klik: START lalu SUBMIT. Setiap quest = +20 EXP. Kumpulkan EXP untuk capai tier Excellence! 🏆',
    color: 'from-purple-600 to-purple-800',
    duration: 5000
  }
];

const CHECKIN_MESSAGES = [
  {
    icon: Clock,
    title: 'Check-In Berhasil! ✅',
    text: 'Selamat! Kamu sudah absen hari ini. Jangan lupa kerjakan quest di menu Aktivitas. Semangat ya! +20 EXP sudah masuk 🔥',
    color: 'from-bpjs-green to-bpjs-green-dark',
    duration: 4000
  },
  {
    icon: Shield,
    title: 'Kamu Dilindungi! 🛡️',
    text: 'Saat magang di BPJS Ketenagakerjaan, kamu berada di lingkungan yang aman. BPJS Ketenagakerjaan menjamin kecelakaan kerja (JKK) untuk semua peserta program. Pelajari manfaatnya — ini ilmu seumur hidup!',
    color: 'from-bpjs-blue to-bpjs-blue-dark',
    duration: 6000
  }
];

export default function WelcomeNotification({ name, trigger, expGained }: Props) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<typeof WELCOME_MESSAGES[0] | null>(null);

  useEffect(() => {
    // Pilih pesan random dari pool yang sesuai
    const pool = trigger === 'checkin' ? CHECKIN_MESSAGES : WELCOME_MESSAGES;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    setMessage(selected);

    // Tampilkan setelah delay singkat (seperti resepsionis yang menyapa)
    const showTimer = setTimeout(() => setVisible(true), 500);

    // Auto-hide setelah durasi yang ditentukan
    const hideTimer = setTimeout(() => setVisible(false), selected.duration + 500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [trigger]);

  if (!message) return null;

  const Icon = message.icon;

  return (
    <>
      {/* Backdrop — transparan, klik untuk dismiss */}
      {visible && (
        <div
          className="fixed inset-0 z-[100] bg-black/20 transition-opacity"
          onClick={() => setVisible(false)}
        />
      )}

      {/* Notification bubble — seperti resepsionis menyapa */}
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-[101] w-[90%] max-w-md transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
        }`}
      >
        <div className={`bg-gradient-to-br ${message.color} rounded-2xl shadow-2xl p-5 relative overflow-hidden`}>
          {/* Decorative pattern */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
              backgroundSize: '12px 12px'
            }}
          />

          {/* Close button */}
          <button
            onClick={() => setVisible(false)}
            className="absolute top-3 right-3 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          {/* Content */}
          <div className="relative flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 mb-0.5">Hai, {name?.split(' ')[0] || 'Peserta'}! 👋</p>
              <h3 className="font-bold text-white text-sm mb-1">{message.title}</h3>
              <p className="text-xs text-white/90 leading-relaxed">{message.text}</p>
            </div>
          </div>

          {/* Progress bar (auto-dismiss indicator) */}
          <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
            <div
              className="h-full bg-white/50"
              style={{
                animation: `shrinkBar ${message.duration}ms linear forwards`
              }}
            />
          </div>
        </div>
      </div>

      {/* Inline style for animation */}
      <style jsx>{`
        @keyframes shrinkBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </>
  );
}
