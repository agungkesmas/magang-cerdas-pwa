'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AIResepsionist from '@/components/shared/AIResepsionist';
import PWACacheCleanup from '@/components/shared/PWACacheCleanup';
import {
  Users,
  CheckSquare,
  MapPin,
  Award,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ShieldCheck,
  School,
  Inbox,
  MessageCircle,
  UserCog,
  Target
} from 'lucide-react';

const NAV = [
  { href: '/admin/attendance', label: 'Kehadiran', icon: MapPin },
  { href: '/admin/requests', label: 'Permintaan Magang', icon: Inbox, badge: true },
  { href: '/admin/interns', label: 'Peserta Magang', icon: Users },
  { href: '/admin/activities', label: 'Riwayat Aktivitas', icon: CheckSquare },
  { href: '/admin/quests', label: 'Quest', icon: Target },
  { href: '/admin/chat', label: 'Chat Grup', icon: MessageCircle },
  { href: '/admin/groups', label: 'Kelola Grup', icon: Users },
  { href: '/admin/certificate', label: 'Sertifikat', icon: Award },
  { href: '/admin/pembina', label: 'Pembina Magang', icon: UserCog },
  { href: '/admin/schools', label: 'Institusi & BKK', icon: School }
];

export default function AdminShell({
  admin,
  children
}: {
  admin: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingReqCount, setPendingReqCount] = useState(0);

  // Fetch pending requests count for badge
  useEffect(() => {
    fetch('/api/admin/requests?status=submitted')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPendingReqCount((d.requests || []).length);
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#EEF2F7] flex">
      {/* Sidebar Desktop */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-bpjs-blue text-white flex flex-col transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bpjs-yellow rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-bpjs-blue-dark" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                MAGANG-CERDAS
              </h1>
              <p className="text-xs text-bpjs-yellow font-medium uppercase tracking-wider">Konsol Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            const showBadge = item.badge && pendingReqCount > 0 && !active;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-bpjs-yellow text-bpjs-blue-dark font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                    {pendingReqCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-3 mb-2 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-bpjs-yellow" />
              <p className="text-sm font-semibold">{admin.name}</p>
            </div>
            <p className="text-xs text-white/60 truncate">{admin.email}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/settings"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                pathname.startsWith('/admin/settings')
                  ? 'bg-white/10 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Pengaturan</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Keluar</span>
            </button>
          </div>
          <p className="text-[10px] text-white/40 text-center mt-3">
            Didukung oleh <span className="text-bpjs-yellow/70 font-medium">Tim Syukur Mikrodigital</span>
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-bpjs-blue text-white px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold">MAGANG-CERDAS</span>
          <button onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
      </div>

      {/* AI Resepsionis */}
      <AIResepsionist dashboard="admin" welcomeName={admin.name?.split(' ')[0]} accentColor="blue" />

      {/* PWA Cache Cleanup — auto-detect & clear stale cache */}
      <PWACacheCleanup />
    </div>
  );
}
