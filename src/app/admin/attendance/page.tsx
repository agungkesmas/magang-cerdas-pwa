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
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Flag,
  ScanSearch,
  ZoomIn,
  X
} from 'lucide-react';
import { fetchFresh } from '@/lib/fresh-fetch';
import CorrectionApprovals from '@/components/admin/CorrectionApprovals';

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
  const [filter, setFilter] = useState<'all' | 'check-in' | 'check-out' | 'suspicious'>('all');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  // Suspicious detection state
  const [suspiciousPatterns, setSuspiciousPatterns] = useState<any[]>([]);
  const [scanningPatterns, setScanningPatterns] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flagModal, setFlagModal] = useState<{ attId: string; internName: string } | null>(null);
  const [flagReason, setFlagReason] = useState('');
  // Setup migration status
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationSql, setMigrationSql] = useState('');
  const [checkingMigration, setCheckingMigration] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, internRes, leaveRes] = await Promise.all([
        fetchFresh('/api/attendance/list?limit=100'),
        fetchFresh('/api/interns/list'),
        fetchFresh('/api/leave/list')
      ]);
      const attData = await attRes.json();
      const internData = await internRes.json();
      const leaveData = await leaveRes.json();
      if (attData.success) setRecords(attData.attendance);
      if (internData.success) setInterns(internData.interns);
      if (leaveData.success) {
        setLeaveRequests(leaveData.leave_requests || []);
        // Build set of intern IDs yang sedang izin approved hari ini (timezone WIB)
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
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


  // Determine which interns haven't checked in today (timezone WIB)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const wibStartMs = new Date(`${todayStr}T00:00:00+07:00`).getTime();
  const wibEndMs = new Date(`${todayStr}T23:59:59.999+07:00`).getTime();
  const checkedInToday = new Set(
    records.filter((r) => {
      if (r.type !== 'Check-In') return false;
      const ts = new Date(r.timestamp).getTime();
      return ts >= wibStartMs && ts <= wibEndMs;
    }).map((r) => r.intern_id)
  );
  const notCheckedIn = interns.filter(
    (i) => i.is_active && !checkedInToday.has(i.id) && !approvedLeaveToday.has(i.id)
  );

  // Determine which interns haven't checked OUT today (sudah check-in tapi belum check-out)
  const checkedOutToday = new Set(
    records.filter((r) => {
      if (r.type !== 'Check-Out') return false;
      const ts = new Date(r.timestamp).getTime();
      return ts >= wibStartMs && ts <= wibEndMs;
    }).map((r) => r.intern_id)
  );
  const notCheckedOut = interns.filter(
    (i) => i.is_active && checkedInToday.has(i.id) && !checkedOutToday.has(i.id) && !approvedLeaveToday.has(i.id)
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

  const filtered = filter === 'all'
    ? records
    : filter === 'suspicious'
      ? records.filter((r: any) => r.is_suspicious)
      : records.filter((r) => r.type.toLowerCase() === filter);
  const pendingLeaves = leaveRequests.filter((lr) => lr.status === 'pending');
  const todayOnLeave = leaveRequests.filter((lr) => {
    if (lr.status !== 'approved') return false;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    return today >= lr.start_date && today <= lr.end_date;
  });

  // ============================================================
  // SUSPICIOUS DETECTION — scan pattern mencurigakan
  // ============================================================
  const handleScanPatterns = async () => {
    setScanningPatterns(true);
    try {
      const res = await fetchFresh('/api/attendance/detect-suspicious');
      const data = await res.json();
      if (data.success) {
        setSuspiciousPatterns(data.patterns || []);
        if (data.patterns?.length === 0) {
          alert('✅ Tidak ada pattern mencurigakan terdeteksi dalam 14 hari terakhir.');
        }
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setScanningPatterns(false);
    }
  };

  const handleFlagSuspicious = async (attId: string, reason: string) => {
    setFlagging(attId);
    try {
      const res = await fetch('/api/attendance/flag-suspicious', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_id: attId, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`✅ ${data.message}`);
      setFlagModal(null);
      setFlagReason('');
      fetchAll();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setFlagging(null);
    }
  };

  const handleUnflagSuspicious = async (attId: string) => {
    if (!confirm('Hapus flag mencurigakan? Nudge sudah terkirim tidak bisa di-recall.')) return;
    try {
      const res = await fetch(`/api/attendance/flag-suspicious?attendance_id=${attId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchAll();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // ============================================================
  // MIGRATION CHECK — verify kolom is_suspicious sudah ada
  // ============================================================
  const checkMigration = useCallback(async () => {
    setCheckingMigration(true);
    try {
      const res = await fetch('/api/admin/setup-suspicious', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success && data.already_exists) {
        setMigrationNeeded(false);
      } else if (data.needs_manual_sql) {
        setMigrationNeeded(true);
        setMigrationSql(data.sql_content || '');
      }
    } catch {
      // Silent fail
    } finally {
      setCheckingMigration(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    checkMigration();
  }, [fetchAll, checkMigration]);

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(migrationSql).then(() => {
      alert('✅ SQL berhasil disalin! Paste di Supabase SQL Editor → Run, lalu refresh halaman ini.');
    });
  };

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

      {/* Koreksi Absen Pending — admin approve/reject */}
      <CorrectionApprovals />

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

      {/* Belum Check-Out Hari Ini — sudah check-in tapi belum check-out */}
      {notCheckedOut.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-blue-900">
              Sudah Check-In, Belum Check-Out ({notCheckedOut.length})
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {notCheckedOut.map((intern) => (
              <div key={intern.id} className="bg-white rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{intern.name}</p>
                  <p className="text-xs text-gray-500">{intern.department}</p>
                </div>
                <button
                  onClick={() => handleNudge(intern.id, intern.name)}
                  className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-md"
                >
                  <Bell className="w-3 h-3" />
                  Nudge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Migration Banner — tampil kalau kolom is_suspicious belum ada */}
      {migrationNeeded && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-amber-900 mb-1">
                ⚠️ Setup Diperlukan untuk Fitur Anti-Fraud
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                Untuk mengaktifkan fitur "Tandai Mencurigakan" dan "Scan Pattern",
                jalankan SQL migration berikut di Supabase SQL Editor:
              </p>
              <pre className="bg-amber-100 border border-amber-200 rounded-md p-3 text-xs text-amber-900 overflow-x-auto mb-3 whitespace-pre-wrap">
{migrationSql}
              </pre>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={copySqlToClipboard}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 py-1.5 rounded-md"
                >
                  📋 Copy SQL
                </button>
                <button
                  onClick={() => checkMigration()}
                  disabled={checkingMigration}
                  className="inline-flex items-center gap-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-700 text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-50"
                >
                  {checkingMigration ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔄 Cek Ulang'}
                </button>
                <a
                  href="https://supabase.com/dashboard/project/ktfyzoowgxvllwauqpir/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md"
                >
                  🔗 Buka Supabase SQL Editor
                </a>
              </div>
              <p className="text-xs text-amber-700 mt-2">
                Setelah Run SQL di Supabase, klik "Cek Ulang" — banner ini akan hilang otomatis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Scan Suspicious */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'check-in', 'check-out', 'suspicious'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === f
                ? f === 'suspicious' ? 'bg-red-500 text-white' : 'bg-bpjs-blue text-white'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            {f === 'all' ? 'Semua' : f === 'check-in' ? 'Check-In' : f === 'check-out' ? 'Check-Out' : `⚠️ Mencurigakan (${records.filter((r: any) => r.is_suspicious).length})`}
          </button>
        ))}
        <button
          onClick={handleScanPatterns}
          disabled={scanningPatterns}
          className="ml-auto inline-flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-50"
          title="Scan pattern mencurigakan (GPS/timestamp konsisten)"
        >
          <ScanSearch className={`w-4 h-4 ${scanningPatterns ? 'animate-spin' : ''}`} />
          {scanningPatterns ? 'Scanning...' : 'Scan Pattern'}
        </button>
      </div>

      {/* Suspicious Patterns Detected */}
      {suspiciousPatterns.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-red-900">
              Pattern Mencurigakan Terdeteksi ({suspiciousPatterns.length})
            </h2>
          </div>
          <div className="space-y-2">
            {suspiciousPatterns.map((p, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-red-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{p.intern_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        p.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.severity === 'high' ? '🔴 Tinggi' : '🟡 Sedang'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {p.pattern_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{p.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Foto (klik zoom)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r: any) => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${(r.is_suspicious) ? 'bg-red-50' : ''}`}>
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
                        <button
                          onClick={() => setZoomPhoto(r.photo_url)}
                          className="relative group"
                          title="Klik untuk zoom"
                        >
                          <img src={r.photo_url} alt="Selfie" className="w-16 h-16 rounded object-cover border-2 border-gray-200 group-hover:border-bpjs-blue" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded flex items-center justify-center transition-colors">
                            <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No photo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.is_suspicious ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Mencurigakan
                          </span>
                          {r.suspicious_reason && (
                            <span className="text-[10px] text-red-600 italic max-w-[200px] truncate" title={r.suspicious_reason}>
                              {r.suspicious_reason}
                            </span>
                          )}
                          <button
                            onClick={() => handleUnflagSuspicious(r.id)}
                            className="text-[10px] text-gray-500 hover:text-gray-700 underline"
                          >
                            Hapus flag
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setFlagModal({ attId: r.id, internName: r.intern?.name || 'Unknown' })}
                          className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md text-xs font-medium border border-amber-200"
                          title="Tandai foto ini mencurigakan"
                        >
                          <Flag className="w-3 h-3" /> Tandai
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zoom Photo Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomPhoto(null)}
        >
          <button className="absolute top-4 right-4 text-white p-2 bg-white/10 hover:bg-white/20 rounded-lg">
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomPhoto}
            alt="Selfie zoom"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Flag Modal — input alasan */}
      {flagModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-gray-900">Tandai Foto Mencurigakan</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Foto <strong>{flagModal.internName}</strong> akan ditandai mencurigakan.
              Peserta akan otomatis dapat nudge peringatan.
            </p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Alasan (opsional): mis. 'foto tidak jelas', 'beda orang', 'seperti screenshot'..."
              className="w-full p-2 border border-gray-200 rounded-md text-sm h-20 mb-3"
              maxLength={200}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setFlagModal(null); setFlagReason(''); }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Batal
              </button>
              <button
                onClick={() => handleFlagSuspicious(flagModal.attId, flagReason)}
                disabled={flagging === flagModal.attId}
                className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
              >
                {flagging === flagModal.attId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '🚩 Tandai & Kirim Nudge'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval history — check-in/out di hari libur yang sudah diproses pembina */}
      {records.filter((r: any) => r.approval_status === 'approved' || r.approval_status === 'rejected').length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-bpjs-blue" />
            Riwayat Approval Check-in/out Hari Libur
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {records
              .filter((r: any) => r.approval_status === 'approved' || r.approval_status === 'rejected')
              .slice(0, 15)
              .map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{r.intern?.name}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${r.type === 'Check-In' ? 'bg-bpjs-green/10 text-bpjs-green' : 'bg-orange-100 text-orange-700'}`}>
                      {r.type}
                    </span>
                    {r.is_holiday_checkin && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px]">
                        📅 Libur
                      </span>
                    )}
                    <span className="text-gray-500">
                      {new Date(r.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      r.approval_status === 'approved' ? 'bg-bpjs-green/10 text-bpjs-green' : 'bg-red-100 text-red-700'
                    }`}>
                      {r.approval_status === 'approved' ? '✓ Disetujui' : '✗ Ditolak'}
                    </span>
                    {r.approved_at && (
                      <span className="text-gray-400 text-[10px]">
                        {new Date(r.approved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
