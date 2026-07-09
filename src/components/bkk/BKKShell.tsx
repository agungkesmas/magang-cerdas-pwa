'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AIResepsionist from '@/components/shared/AIResepsionist';
import PWACacheCleanup from '@/components/shared/PWACacheCleanup';
import { Home, Users, LogOut, GraduationCap, Menu, X, UserCircle, Award, Send, Bell } from 'lucide-react';

const NAV = [
  { href: '/bkk/home', label: 'Beranda', icon: Home },
  { href: '/bkk/interns', label: 'Peserta Magang', icon: Users },
  { href: '/bkk/requests', label: 'Permintaan Magang', icon: Send, badge: true },
  { href: '/bkk/certificates', label: 'Sertifikat', icon: Award },
  { href: '/bkk/profile', label: 'Profil', icon: UserCircle }
];

interface BKKNotif {
  id: string;
  type: string;
  title: string;
  message: string;
  related_request_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function BKKShell({
  teacher,
  children
}: {
  teacher: { name: string; schools?: string[] };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Active req count = permintaan yang belum di-approve/reject (menunggu admin action)
  const [activeReqCount, setActiveReqCount] = useState(0);
  const [notifs, setNotifs] = useState<BKKNotif[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch active requests + notifications
  const fetchData = async () => {
    try {
      const [reqRes, notifRes] = await Promise.all([
        fetch('/api/bkk/requests'),
        fetch('/api/bkk/notifications').catch(() => null)
      ]);
      const reqData = await reqRes.json();
      if (reqData.success) {
        // FIX P2-11: badge hanya untuk request yang menunggu admin review (submitted + under_review)
        // 'accepted' sudah final dari sisi admin → BKK tinggal tambah peserta, bukan pending
        const count = (reqData.requests || []).filter((r: any) =>
          ['submitted', 'under_review'].includes(r.status)
        ).length;
        setActiveReqCount(count);
      }
      if (notifRes && notifRes.ok) {
        const notifData = await notifRes.json();
        if (notifData.success) {
          setNotifs(notifData.notifications || []);
          setUnreadNotifCount(notifData.unread_count || 0);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
    // Polling notif tiap 60s saat user aktif
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Close notif panel on outside click
  useEffect(() => {
    if (!showNotifPanel) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPanel]);

  const markAllRead = async () => {
    await fetch('/api/bkk/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true })
    });
    fetchData();
  };

  const markOneRead = async (id: string) => {
    await fetch('/api/bkk/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchData();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/bkk/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] flex">
      {/* Sidebar Desktop */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-bpjs-green text-white flex flex-col transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bpjs-yellow rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-bpjs-blue-dark" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                MAGANG-CERDAS
              </h1>
              <p className="text-xs text-bpjs-yellow font-medium uppercase tracking-wider">Dashboard BKK</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            const showBadge = item.badge && activeReqCount > 0 && !active;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                  active
                    ? 'bg-bpjs-yellow text-bpjs-blue-dark font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                    {activeReqCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-3 mb-2 bg-white/5 rounded-lg">
            <p className="text-sm font-semibold">{teacher.name}</p>
            <p className="text-xs text-white/60 mt-0.5 truncate">
              {teacher.schools && teacher.schools.length > 0
                ? `${teacher.schools.length} sekolah dibimbing`
                : 'Belum ada sekolah'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Keluar</span>
          </button>
          <p className="text-[10px] text-white/40 text-center mt-3">
            Didukung oleh <span className="text-bpjs-yellow/70 font-medium">Tim Syukur Mikrodigital</span>
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-bpjs-green text-white px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold">Dashboard BKK</span>
          <button onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop top bar with notification bell */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200 px-8 py-3 items-center justify-end">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-2 rounded-lg hover:bg-gray-100"
              title="Notifikasi"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="font-bold text-gray-800 text-sm">Notifikasi</h3>
                  {unreadNotifCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-bpjs-blue hover:underline">
                      Tandai semua dibaca
                    </button>
                  )}
                </div>
                {notifs.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Belum ada notifikasi
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                      onClick={() => {
                        if (!n.is_read) markOneRead(n.id);
                        if (n.related_request_id) {
                          router.push('/bkk/requests');
                          setShowNotifPanel(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
      </div>

      {/* AI Resepsionis */}
      <AIResepsionist dashboard="bkk" welcomeName={teacher.name?.split(' ')[0]} accentColor="green" />

      {/* PWA Cache Cleanup — auto-detect & clear stale cache */}
      <PWACacheCleanup />
    </div>
  );
}
