'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AIResepsionist from '@/components/shared/AIResepsionist';
import PWACacheCleanup from '@/components/shared/PWACacheCleanup';
import {
  Home,
  MapPin,
  CheckSquare,
  Trophy,
  LogOut,
  Zap,
  Menu,
  X,
  Bell,
  UserCircle,
  MessageCircle
} from 'lucide-react';

const NAV_ALL = [
  { href: '/intern/home', label: 'Home', icon: Home },
  { href: '/intern/attendance', label: 'Kehadiran', icon: MapPin },
  { href: '/intern/activities', label: 'Aktivitas', icon: CheckSquare },
  { href: '/intern/chat', label: 'Chat Grup', icon: MessageCircle },
  { href: '/intern/certificate', label: 'Sertifikat', icon: Trophy },
  { href: '/intern/profile', label: 'Profil', icon: UserCircle }
];

export default function InternShell({
  intern,
  children
}: {
  intern: { name: string; username: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV = NAV_ALL;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/intern/login');
  };

  return (
    <div className="min-h-screen bg-agent-bg text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-agent-bg/80 backdrop-blur-md border-b border-agent-border safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden text-white"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/intern/home" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-bpjs-yellow to-amber-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-bpjs-blue-dark" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                MAGANG-CERDAS
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/intern/certificate"
              className="relative p-1.5 text-white/70 hover:text-bpjs-yellow"
            >
              <Bell className="w-5 h-5" />
            </Link>
            <div className="text-right">
              <div className="text-xs text-white/60">Agent</div>
              <div className="text-sm font-semibold">{intern.name.split(' ')[0]}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute top-0 left-0 bottom-0 w-64 bg-agent-card border-r border-agent-border p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active
                        ? 'bg-bpjs-yellow text-bpjs-blue-dark'
                        : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 p-4 pb-24 lg:pb-8 max-w-5xl w-full mx-auto">{children}</main>

      {/* Bottom nav (mobile-first PWA) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-agent-card/95 backdrop-blur-md border-t border-agent-border safe-bottom">
        <div
          className="grid gap-1 p-1"
          style={{ gridTemplateColumns: `repeat(${NAV.length}, 1fr)` }}
        >
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 rounded-md ${
                  active ? 'text-bpjs-yellow' : 'text-white/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar (lg+) — alternative layout for tablets/desktops */}
      <div className="hidden lg:block fixed left-0 top-16 bottom-0 w-56 border-r border-agent-border bg-agent-card/50">
        <div className="p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'bg-bpjs-yellow text-bpjs-blue-dark'
                    : 'text-white/80 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
          <p className="text-[10px] text-white/40 text-center pt-3 mt-3 border-t border-agent-border">
            Powered by <span className="text-bpjs-yellow/70 font-medium">Tim Syukur Mikrodigital</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 1024px) {
          main {
            margin-left: 14rem;
          }
        }
      `}</style>

      {/* AI Resepsionis — sembunyikan di chat room (konflik dengan tombol send) */}
      {!pathname.startsWith('/intern/chat/') && (
        <AIResepsionist dashboard="intern" welcomeName={intern.name?.split(' ')[0]} accentColor="purple" bottomOffset="bottom-20" />
      )}

      {/* PWA Cache Cleanup — auto-detect & clear stale cache */}
      <PWACacheCleanup />
    </div>
  );
}
