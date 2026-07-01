'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, Bell, Clock, CheckCircle2 } from 'lucide-react';

interface AttendanceRow {
  id: string;
  intern_id: string;
  timestamp: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  photo_url: string | null;
  is_within_geofence: boolean;
  notes: string | null;
  intern: { name: string; major: string; department: string };
}

interface Intern {
  id: string;
  name: string;
  major: string;
  department: string;
  total_exp: number;
  streak_count: number;
  is_active: boolean;
  time_progress: number;
  days_remaining: number;
}

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'check-in' | 'check-out'>('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, internRes] = await Promise.all([fetch('/api/attendance/list?limit=100'), fetch('/api/interns/list')]);
      const attData = await attRes.json();
      const internData = await internRes.json();
      if (attData.success) setRecords(attData.attendance);
      if (internData.success) setInterns(internData.interns);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Determine which interns haven't checked in today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const checkedInToday = new Set(
    records.filter((r) => r.type === 'Check-In' && new Date(r.timestamp) >= todayStart).map((r) => r.intern_id)
  );
  const notCheckedIn = interns.filter((i) => i.is_active && !checkedInToday.has(i.id));

  const handleNudge = async (internId: string, name: string) => {
    if (!confirm(`Kirim nudge ke ${name}?`)) return;
    await fetch('/api/nudge/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intern_id: internId,
        message: 'Hai! Jangan lupa check-in hari ini ya. Semangat magang!',
        type: 'check_in_reminder'
      })
    });
    alert(`Nudge terkirim ke ${name}!`);
  };

  const filtered = filter === 'all' ? records : records.filter((r) => r.type.toLowerCase() === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Kehadiran & Nudge Monitor
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {checkedInToday.size} dari {interns.filter((i) => i.is_active).length} magang sudah check-in hari ini
        </p>
      </div>

      {/* Nudge needed */}
      {notCheckedIn.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-orange-600" />
            <h2 className="font-semibold text-orange-900">Belum Check-In Hari Ini ({notCheckedIn.length})</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {notCheckedIn.map((intern) => (
              <div key={intern.id} className="bg-white rounded-lg p-3 border border-orange-100 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{intern.name}</p>
                  <p className="text-xs text-gray-500">{intern.department}</p>
                </div>
                <button
                  onClick={() => handleNudge(intern.id, intern.name)}
                  className="ml-2 inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-2 py-1 rounded-md"
                >
                  <Bell className="w-3 h-3" />
                  Nudge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'check-in', 'check-out'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === f ? 'bg-bpjs-blue text-white' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            {f === 'all' ? 'Semua' : f === 'check-in' ? 'Check-In' : 'Check-Out'}
          </button>
        ))}
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada record kehadiran.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Magang</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipe</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Lokasi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.intern?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{r.intern?.department}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.type === 'Check-In' ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" /> In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" /> Out
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(r.timestamp).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {r.distance_meters !== null ? (
                        <span className={r.is_within_geofence ? 'text-green-600' : 'text-red-600'}>
                          {Math.round(r.distance_meters)}m
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.photo_url ? (
                        <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                          <img src={r.photo_url} alt="Selfie" className="w-10 h-10 rounded object-cover" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">No photo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
