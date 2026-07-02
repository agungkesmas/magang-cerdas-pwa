'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookHeart, Loader2, Calendar, Search, BookOpen } from 'lucide-react';

interface DashboardData {
  teacher: { name: string; school_origin: string };
  interns: any[];
}

export default function BKKLogbookPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIntern, setSelectedIntern] = useState<string | null>(null);
  const [logbook, setLogbook] = useState<any[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/bkk')
      .then((r) => r.json())
      .then((d) => d.success && setData(d))
      .finally(() => setLoading(false));
  }, []);

  const loadLogbook = async (internId: string) => {
    setSelectedIntern(internId);
    setLoadingLog(true);
    try {
      const res = await fetch(`/api/bkk/intern-detail?id=${internId}`);
      const d = await res.json();
      if (d.success) setLogbook(d.logbook_entries || []);
    } finally {
      setLoadingLog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
      </div>
    );
  }

  if (!data) return null;

  const filteredInterns = data.interns.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Review Logbook
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Baca catatan harian siswa untuk evaluasi pembelajaran magang
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: intern list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/30"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              {filteredInterns.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">Tidak ada siswa ditemukan.</div>
              ) : (
                filteredInterns.map((intern) => (
                  <button
                    key={intern.id}
                    onClick={() => loadLogbook(intern.id)}
                    className={`w-full text-left p-3 border-b border-gray-100 hover:bg-green-50/30 transition-colors ${
                      selectedIntern === intern.id ? 'bg-bpjs-green/10 border-l-4 border-l-bpjs-green' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-bpjs-green font-bold text-sm">{intern.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{intern.name}</p>
                        <p className="text-xs text-gray-500">
                          {intern.logbook_count} logbook • {intern.major}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: logbook entries */}
        <div className="lg:col-span-2">
          {!selectedIntern ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <BookHeart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Pilih siswa di kiri untuk membaca logbook-nya</p>
            </div>
          ) : loadingLog ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
            </div>
          ) : logbook.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Siswa ini belum mengisi logbook.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {logbook.map((log) => (
                <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-bpjs-green" />
                    <span className="text-xs font-bold text-bpjs-green">
                      {new Date(log.entry_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500 font-medium">AKTIVITAS</div>
                      <p className="text-sm text-gray-800">{log.activity}</p>
                    </div>
                    {log.learning_summary && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium">PEMBELAJARAN</div>
                        <p className="text-sm text-gray-700 italic">💡 {log.learning_summary}</p>
                      </div>
                    )}
                    {log.difficulties && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium">KESULITAN</div>
                        <p className="text-sm text-orange-700">⚠️ {log.difficulties}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
