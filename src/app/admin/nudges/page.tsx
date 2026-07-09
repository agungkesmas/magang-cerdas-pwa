'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Loader2,
  Search,
  RefreshCw,
  User,
  Send,
  CheckCircle2
} from 'lucide-react';

interface Nudge {
  id: string;
  intern_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  created_by_type: string | null;
  created_by_id: string | null;
  created_by_name: string | null;
  intern?: { name: string; school_origin: string | null; major: string | null };
}

export default function AdminNudgesPage() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSender, setFilterSender] = useState<string>('all'); // all/admin/bkk/pembina/system
  const [filterRead, setFilterRead] = useState<string>('all'); // all/read/unread

  const fetchNudges = useCallback(async () => {
    setLoading(true);
    try {
      // Admin GET tanpa intern_id → return semua nudge (limit 50 terbaru)
      const res = await fetch('/api/nudge/list');
      const data = await res.json();
      if (data.success) {
        // Fetch intern names untuk enrich
        const internIds = Array.from(new Set((data.nudges || []).map((n: Nudge) => n.intern_id)));
        const internsRes = await fetch('/api/interns/list');
        const internsData = await internsRes.json();
        const internMap = new Map<string, any>();
        (internsData.interns || []).forEach((i: any) => internMap.set(i.id, i));
        const enriched = (data.nudges || []).map((n: Nudge) => ({
          ...n,
          intern: internMap.get(n.intern_id) || null
        }));
        setNudges(enriched);
      }
    } catch (e) {
      console.error('fetch nudges error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNudges(); }, [fetchNudges]);

  const filtered = nudges.filter((n) => {
    if (filterSender !== 'all' && n.created_by_type !== filterSender) return false;
    if (filterRead === 'read' && !n.is_read) return false;
    if (filterRead === 'unread' && n.is_read) return false;
    if (search) {
      const s = search.toLowerCase();
      const internName = n.intern?.name || '';
      const senderName = n.created_by_name || '';
      if (!n.message.toLowerCase().includes(s) &&
          !internName.toLowerCase().includes(s) &&
          !senderName.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const senderBadge = (type: string | null) => {
    if (!type) return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">unknown</span>;
    const colors: Record<string, string> = {
      admin: 'bg-blue-100 text-blue-700',
      bkk: 'bg-green-100 text-green-700',
      pembina: 'bg-purple-100 text-purple-700',
      system: 'bg-gray-100 text-gray-600'
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[type] || colors.system}`}>{type}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Riwayat Nudge
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit trail semua nudge yang dikirim ke peserta magang (admin, BKK, pembina, system)
          </p>
        </div>
        <button
          onClick={fetchNudges}
          className="inline-flex items-center gap-1 text-sm bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pesan, nama peserta, atau pengirim..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-blue/30"
          />
        </div>
        <select
          value={filterSender}
          onChange={(e) => setFilterSender(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Semua Pengirim</option>
          <option value="admin">Admin</option>
          <option value="bkk">BKK</option>
          <option value="pembina">Pembina</option>
          <option value="system">System</option>
        </select>
        <select
          value={filterRead}
          onChange={(e) => setFilterRead(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Semua Status</option>
          <option value="read">Sudah Dibaca</option>
          <option value="unread">Belum Dibaca</option>
        </select>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} dari {nudges.length} nudge</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Belum ada nudge yang cocok dengan filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div key={n.id} className={`bg-white rounded-xl border p-4 ${n.is_read ? 'border-gray-200' : 'border-blue-300 bg-blue-50/30'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {senderBadge(n.created_by_type)}
                  <span className="text-xs text-gray-500">
                    dari <b className="text-gray-700">{n.created_by_name || 'Tidak diketahui'}</b>
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <b>{n.intern?.name || 'Peserta tidak ditemukan'}</b>
                    {n.intern?.school_origin && <span className="text-gray-400">({n.intern.school_origin})</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {n.is_read ? (
                    <span className="inline-flex items-center gap-1 text-bpjs-green">
                      <CheckCircle2 className="w-3 h-3" /> Dibaca
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-blue-600">
                      <Bell className="w-3 h-3" /> Belum dibaca
                    </span>
                  )}
                  <span className="text-gray-400">
                    {new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Send className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-800 whitespace-pre-line flex-1">{n.message}</p>
              </div>
              {n.type && n.type !== 'check_in_reminder' && (
                <div className="mt-2 text-xs text-gray-400">Tipe: {n.type}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
