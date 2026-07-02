'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AIResepsionist from '@/components/shared/AIResepsionist';
import { Home, Users, BookHeart, LogOut, GraduationCap, Menu, X, UserCircle, Award, Send } from 'lucide-react';

const NAV = [
  { href: '/bkk/home', label: 'Beranda', icon: Home },
  { href: '/bkk/requests', label: 'Permintaan Magang', icon: Send, badge: true },
  { href: '/bkk/interns', label: 'Peserta Magang', icon: Users },
  { href: '/bkk/certificates', label: 'Sertifikat', icon: Award },
  { href: '/bkk/logbook', label: 'Logbook', icon: BookHeart },
  { href: '/bkk/profile', label: 'Profil', icon: UserCircle }
];

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
  const [activeReqCount, setActiveReqCount] = useState(0);

  // Fetch active requests count for badge
  useEffect(() => {
    fetch('/api/bkk/requests')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const count = (d.requests || []).filter((r: any) => ['submitted', 'under_review', 'accepted'].includes(r.status)).length;
          setActiveReqCount(count);
        }
      })
      .catch(() => {});
  }, [pathname]);

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
              <p className="text-xs text-bpjs-yellow font-medium uppercase tracking-wider">BKK Dashboard</p>
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
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-bpjs-green text-white px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold">BKK Dashboard</span>
          <button onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
      </div>

      {/* AI Resepsionis */}
      <AIResepsionist dashboard="bkk" welcomeName={teacher.name?.split(' ')[0]} accentColor="green" />
    </div>
  );
}
