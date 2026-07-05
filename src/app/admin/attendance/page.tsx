'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Loader2,
  Bell,
  Clock,
  CheckCircle2,
  FileText,
  XCircle,
  AlertCircle
} from 'lucide-react';

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

interface LeaveRequest {
  id: string;
  intern_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  medical_certificate_url: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
  intern: { name: string; major: string; department: string; school_origin: string } | null;
}

const LEAVE_LABELS: Record<string, { label: string; color: string }> = {
  sakit: { label: 'Sakit', color: 'bg-red-100 text-red-700' },
  izin: { label: 'Izin', color: 'bg-amber-100 text-amber-700' },
  cuti: { label: 'Cuti', color: 'bg-blue-100 text-blue-700' },
  'dinas-luar': { label: 'Dinas Luar', color: 'bg-purple-100 text-purple-700' }
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '⏳ Pending', color: 'bg-amber-100 text-amber-700' },
  approved: { label: '✓ Approved', color: 'bg-green-100 text-green-700' },
  rejected: { label: '✗ Rejected', color: 'bg-red-100 text-red-700' }
};

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [approvedLeaveToday, setApprovedLeaveToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'check-in' | 'check-out'>('all');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, internRes, leaveRes] = await Promise.all([
        fetch('/api/attendance/list?limit=100'),
        fetch('/api/interns/list'),
        fetch('/api/leave/list')
      ]);
      const attData = await attRes.json();
      const internData = await internRes.json();
      const leaveData = await leaveRes.json();
      if (attData.success) setRecords(attData.attendance);
      if (internData.success) setInterns(internData.interns);
      if (leaveData.success) {
        setLeaveRequests(leaveData.leave_requests || []);
        // Build set of intern IDs yang sedang izin approved hari ini
        const today = new Date().toISOString().split('T')[0];
        const onLeaveToday = new Set<string>(
          (leaveData.leave_requests || [])
            .filter((lr: any) => lr.status === 'approved' && today >= lr.start_date && today <= lr.end_date)
            .map((lr: any) => lr.intern_id as string)
        );
        setApprovedLeaveToday(onLeaveToday);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Determine which interns haven't checked in today (exclude yang sedang izin approved)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const checkedInToday = new Set(
    records.filter((r) => r.type === 'Check-In' && new Date(r.timestamp) >= todayStart).map((r) => r.intern_id)
  );
  const notCheckedIn = interns.filter(
    (i) => i.is_active && !checkedInToday.has(i.id) && !approvedLeaveToday.has(i.id)
  );

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

  const handleApprove = async (id: string) => {
    setReviewing(id);
    try {
      const res = await fetch('/api/leave/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchAll();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setReviewing(null);
    }
  };

  const handleReject = async (id: string) => {
    const notes = rejectNotes[id]?.trim();
    if (!notes) {
      alert('Alasan penolakan wajib diisi');
      return;
    }
    setReviewing(id);
    try {
      const res = await fetch('/api/leave/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, review_notes: notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRejectNotes({ ...rejectNotes, [id]: '' });
      fetchAll();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setReviewing(null);
    }
  };

  const filtered = filter === 'all' ? records : records.filter((r) => r.type.toLowerCase() === filter);
  const pendingLeaves = leaveRequests.filter((lr) => lr.status === 'pending');
  const todayOnLeave = leaveRequests.filter((lr) => {
    if (lr.status !== 'approved') return false;
    const today = new Date().toISOString().split('T')[0];
    return today >= lr.start_date && today <= lr.end_date;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Kehadiran & Pengajuan Izin
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {checkedInToday.size} hadir • {todayOnLeave.length} izin • {pendingLeaves.length} pending approval
        </p>
      </div>

      {/* Pending Leave Approvals */}
      {pendingLeaves.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-amber-900">
              Pengajuan Izin Menunggu Approval ({pendingLeaves.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingLeaves.map((lr) => {
              const leaveInfo = LEAVE_LABELS[lr.type] || { label: lr.type, color: 'bg-gray-100 text-gray-700' };
              return (
                <div key={lr.id} className="bg-white rounded-lg border border-amber-100 p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900">{lr.intern?.name || 'Unknown'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${leaveInfo.color}`}>
                          {leaveInfo.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {lr.start_date === lr.end_date
                            ? new Date(lr.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
                            : `${new Date(lr.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(lr.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                          }
                        </span>
                        {lr.medical_certificate_url && (
                          <a href={lr.medical_certificate_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline">
                            📎 Surat Dokter
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{lr.reason}</p>
                    </div>
                  </div>

                  {/* Reject reason input (shown when reject button clicked) */}
                  {rejectNotes[lr.id] !== undefined && (
                    <div className="mb-2">
                      <input
                        type="text"
                        placeholder="Alasan penolakan (wajib)..."
                        value={rejectNotes[lr.id] || ''}
                        onChange={(e) => setRejectNotes({ ...rejectNotes, [lr.id]: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(lr.id)}
                      disabled={reviewing === lr.id}
                      className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {reviewing === lr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Approve
                    </button>
                    {rejectNotes[lr.id] === undefined ? (
                      <button
                        onClick={() => setRejectNotes({ ...rejectNotes, [lr.id]: '' })}
                        className="inline-flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReject(lr.id)}
                        disabled={reviewing === lr.id}
                        className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        Konfirmasi Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today on leave */}
      {todayOnLeave.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-blue-900 text-sm">Sedang Izin Hari Ini ({todayOnLeave.length})</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {todayOnLeave.map((lr) => {
              const info = LEAVE_LABELS[lr.type] || { label: lr.type, color: 'bg-gray-100 text-gray-700' };
              return (
                <span key={lr.id} className="text-xs px-2 py-1 bg-white border border-blue-200 rounded-lg">
                  {lr.intern?.name} <span className={`ml-1 px-1.5 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Nudge needed */}
      {notCheckedIn.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-orange-600" />
            <h2 className="font-semibold text-orange-900">
              Belum Check-In Hari Ini ({notCheckedIn.length})
            </h2>
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
                  className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-2 py-1 rounded-md"
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

      {/* Recent leave requests history */}
      {leaveRequests.filter((lr) => lr.status !== 'pending').length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            Riwayat Pengajuan Izin
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {leaveRequests.filter((lr) => lr.status !== 'pending').slice(0, 10).map((lr) => {
              const leaveInfo = LEAVE_LABELS[lr.type] || { label: lr.type, color: 'bg-gray-100 text-gray-700' };
              const statusInfo = STATUS_LABELS[lr.status] || { label: lr.status, color: 'bg-gray-100 text-gray-700' };
              return (
                <div key={lr.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{lr.intern?.name}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${leaveInfo.color}`}>{leaveInfo.label}</span>
                    <span className="text-gray-500">
                      {lr.start_date === lr.end_date
                        ? new Date(lr.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                        : `${new Date(lr.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(lr.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lr.review_notes && <span className="text-gray-400 italic hidden sm:inline">"{lr.review_notes.slice(0, 30)}"</span>}
                    <span className={`px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
