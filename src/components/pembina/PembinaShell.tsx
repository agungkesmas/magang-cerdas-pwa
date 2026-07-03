'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  MessageCircle,
  Users,
  LogOut,
  UserCog,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import AIResepsionist from '@/components/shared/AIResepsionist';

const NAV = [
  { href: '/pembina/home', label: 'Beranda', icon: Home },
  { href: '/pembina/groups', label: 'Grup Saya', icon: Users },
  { href: '/pembina/chat', label: 'Chat Grup', icon: MessageCircle }
];

export default function PembinaShell({
  pembina,
  children
}: {
  pembina: { name: string; pembina_code: string; department: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/pembina-logout', { method: 'POST' });
    router.push('/pembina/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F3F4F6] flex">
      {/* Sidebar Desktop */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-purple-700 text-white flex flex-col transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bpjs-yellow rounded-xl flex items-center justify-center">
              <UserCog className="w-7 h-7 text-purple-900" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                MAGANG-CERDAS
              </h1>
              <p className="text-xs text-bpjs-yellow font-medium uppercase tracking-wider">Dashboard Pembina</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-bpjs-yellow text-purple-900 font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-3 mb-2 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <UserCog className="w-4 h-4 text-bpjs-yellow" />
              <p className="text-sm font-semibold">{pembina.name}</p>
            </div>
            <p className="text-xs text-white/60">{pembina.pembina_code} • {pembina.department}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Keluar</span>
          </button>
          <p className="text-[10px] text-white/40 text-center mt-3">
            Powered by <span className="text-bpjs-yellow/70 font-medium">Tim Syukur Mikrodigital</span>
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-purple-700 text-white px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold">Pembina</span>
          <button onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
      </div>

      {/* AI Resepsionis — sembunyikan di chat room (konflik dengan tombol send) */}
      {!pathname.startsWith('/pembina/chat/') && (
        <AIResepsionist dashboard="pembina" welcomeName={pembina.name?.split(' ')[0]} accentColor="purple" />
      )}
    </div>
  );
}
