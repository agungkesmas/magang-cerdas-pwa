'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  CheckCircle2,
  Calendar,
  Award,
  Users,
  Target,
  FileText,
  AlertCircle,
  ShieldCheck,
  Clock,
  Download,
  Mail,
  Phone,
  Filter,
  Gift
} from 'lucide-react';

interface TimelineItem {
  id: string;
  timestamp: string;
  type: 'check_in' | 'check_out' | 'task_complete' | 'task_daily_complete' | 'quest' | 'leave' | 'certificate' | 'group_join' | 'bonus_xp';
  title: string;
  description?: string;
  metadata?: any;
}

interface Intern {
  id: string;
  name: string;
  school_origin: string;
  major: string;
  department: string;
  start_date: string;
  end_date: string;
  total_exp: number;
  streak_count: number;
  is_active: boolean;
  certificate_unlocked: boolean;
  photo_url?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  tags?: string[] | null;
}

interface CertRow {
  id: string;
  tier: string;
  issue_date: string;
  verification_id: string;
  pdf_url: string | null;
  officials?: any;
}

interface TimelineResponse {
  success: boolean;
  intern: Intern;
  timeline: TimelineItem[];
  summary: any;
  groups: any[];
  certificates: CertRow[];
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatDateTime(d: string): string {
  try {
    return new Date(d).toLocaleString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return d;
  }
}

function tierColor(tier: string): { color: string; bg: string; ring: string } {
  if (tier === 'Excellence') return { color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' };
  if (tier === 'Competent') return { color: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' };
  return { color: 'text-gray-700', bg: 'bg-gray-50', ring: 'ring-gray-200' };
}

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  check_in: { label: 'Check-In', icon: MapPin, color: 'text-bpjs-green', bg: 'bg-bpjs-green/10' },
  check_out: { label: 'Check-Out', icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-100' },
  task_complete: { label: 'Tugas Selesai', icon: CheckCircle2, color: 'text-bpjs-blue', bg: 'bg-bpjs-blue/10' },
  task_daily_complete: { label: 'Tugas Harian', icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-100' },
  quest: { label: 'Quest', icon: Target, color: 'text-pink-600', bg: 'bg-pink-100' },
  leave: { label: 'Izin/Cuti', icon: FileText, color: 'text-yellow-700', bg: 'bg-yellow-100' },
  certificate: { label: 'Sertifikat', icon: Award, color: 'text-amber-700', bg: 'bg-amber-100' },
  group_join: { label: 'Grup', icon: Users, color: 'text-gray-600', bg: 'bg-gray-100' },
  bonus_xp: { label: 'Bonus XP', icon: Gift, color: 'text-amber-600', bg: 'bg-amber-100' }
};

export default function InternTimelineView({
  internId,
  backHref = '/admin/activities',
  viewerRole = 'admin'
}: {
  internId: string;
  backHref?: string;
  viewerRole?: 'admin' | 'pembina' | 'bkk';
}) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [bonusModal, setBonusModal] = useState<{ activityId: string; activityTitle: string; completionId: string } | null>(null);
  const [bonusXp, setBonusXp] = useState(20);
  const [bonusNote, setBonusNote] = useState('');
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusError, setBonusError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/interns/${internId}/timeline`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
        else setError(d.error || 'Gagal memuat');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [internId]);

  const filteredTimeline = useMemo(() => {
    if (!data) return [];
    if (typeFilter === 'all') return data.timeline;
    return data.timeline.filter((t) => t.type === typeFilter);
  }, [data, typeFilter]);

  const typeOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.timeline.map((t) => t.type));
    return Array.from(set);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-bpjs-blue">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Gagal memuat riwayat</p>
            <p className="text-sm">{error || 'Data tidak ditemukan'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { intern, summary, certificates } = data;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-bpjs-blue"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar peserta
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-bpjs-blue to-bpjs-blue-dark px-6 py-8 text-white">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {intern.photo_url ? (
                <img src={intern.photo_url} alt={intern.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold">{(intern.name || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {intern.name}
              </h1>
              <p className="text-white/80 text-sm mb-2">
                {intern.school_origin} • {intern.major}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-white/20 rounded-full">{intern.department}</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formatDate(intern.start_date)} → {formatDate(intern.end_date)}
                </span>
                <span className="px-2 py-0.5 bg-bpjs-yellow text-bpjs-blue-dark rounded-full font-semibold">
                  {(intern.total_exp || 0).toLocaleString('id-ID')} EXP
                </span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full">Streak {intern.streak_count || 0} hari</span>
                {!intern.is_active && (
                  <span className="px-2 py-0.5 bg-gray-500/40 rounded-full">Sudah Arsip</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border-t border-gray-200">
          <div className="p-4">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <MapPin className="w-3 h-3" /> Total Absensi
            </div>
            <div className="text-xl font-bold text-gray-900">
              {summary.total_checkins}<span className="text-sm text-gray-500 font-normal"> CI</span>
              <span className="text-gray-300 mx-1">/</span>
              {summary.total_checkouts}<span className="text-sm text-gray-500 font-normal"> CO</span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <CheckCircle2 className="w-3 h-3" /> Tugas Selesai
            </div>
            <div className="text-xl font-bold text-bpjs-blue">{summary.total_tasks_completed}</div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <Target className="w-3 h-3" /> Quest
            </div>
            <div className="text-xl font-bold text-pink-600">{summary.total_quests}</div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <FileText className="w-3 h-3" /> Pengajuan Izin
            </div>
            <div className="text-xl font-bold text-yellow-700">{summary.total_leaves}</div>
          </div>
        </div>

        {/* Contact info */}
        {(intern.email || intern.whatsapp) && (
          <div className="border-t border-gray-200 p-4 bg-gray-50/50 flex flex-wrap gap-4 text-sm">
            {intern.email && (
              <span className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400" /> {intern.email}
              </span>
            )}
            {intern.whatsapp && (
              <span className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400" /> {intern.whatsapp}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Certificates section (anti-pemalsuan) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-amber-600" />
          <h2
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Sertifikat & Verifikasi
          </h2>
        </div>
        {certificates.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            <Award className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            Belum ada sertifikat yang diterbitkan untuk peserta ini.
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.map((c) => {
              const tc = tierColor(c.tier);
              return (
                <div
                  key={c.id}
                  className={`border rounded-xl p-4 ${tc.bg} ring-1 ${tc.ring}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-lg font-bold ${tc.color}`}>{c.tier}</span>
                        <span className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600 font-mono">
                          {c.verification_id}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>Tanggal Terbit: {formatDate(c.issue_date)}</p>
                        {c.officials && (
                          <p>Diterbitkan oleh: {c.officials.name} — {c.officials.position} {c.officials.branch ? `(${c.officials.branch})` : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-stretch">
                      <Link
                        href={`/api/certificate/verify?id=${c.verification_id}`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-bpjs-blue rounded-lg text-xs font-semibold text-bpjs-blue"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Verifikasi (Public)
                      </Link>
                      {c.pdf_url && (
                        <a
                          href={c.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-bpjs-blue rounded-lg text-xs font-semibold text-gray-700"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-bpjs-blue" />
            <h2
              className="text-lg font-bold text-gray-900"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Timeline Aktivitas
            </h2>
            <span className="text-xs text-gray-500">({data.timeline.length} entri)</span>
          </div>
          {typeOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              >
                <option value="all">Semua Jenis</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{TYPE_META[t]?.label || t}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            Belum ada aktivitas tercatat.
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-3">
              {filteredTimeline.map((item) => {
                const meta = TYPE_META[item.type] || TYPE_META.group_join;
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="relative pl-12">
                    {/* Bullet */}
                    <div
                      className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.bg} ring-4 ring-white`}
                    >
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    {/* Card */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                          <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {formatDateTime(item.timestamp)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{item.description}</p>
                      )}
                      {/* Type-specific metadata */}
                      {item.type === 'check_in' || item.type === 'check_out' ? (
                        <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-2">
                          {item.metadata?.is_within_geofence !== undefined && (
                            <span className={item.metadata.is_within_geofence ? 'text-bpjs-green' : 'text-red-600'}>
                              {item.metadata.is_within_geofence ? '✓ Dalam radius kantor' : '✗ Di luar radius'}
                            </span>
                          )}
                          {item.metadata?.distance_meters !== null && item.metadata?.distance_meters !== undefined && (
                            <span>{Math.round(item.metadata.distance_meters)} m dari kantor</span>
                          )}
                          {item.metadata?.has_photo && <span>📷 Ada foto</span>}
                        </div>
                      ) : item.type === 'task_complete' ? (
                        <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-2 items-center">
                          {item.metadata?.xp_reward > 0 && (
                            <span className="text-bpjs-green font-medium">+{item.metadata.xp_reward} EXP</span>
                          )}
                          {item.metadata?.is_self_added && (
                            <span className="text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded">Self-Added</span>
                          )}
                          {item.metadata?.has_bonus && (
                            <span className="text-amber-600 font-medium flex items-center gap-0.5">
                              <Gift className="w-3 h-3" /> +{item.metadata.bonus_xp} bonus
                              {item.metadata.bonus_note && (
                                <span className="italic text-gray-500 ml-1">"{item.metadata.bonus_note}"</span>
                              )}
                            </span>
                          )}
                          {/* Tombol +Bonus XP — hanya pembina, hanya untuk aktivitas self-added yang belum dapat bonus */}
                          {viewerRole === 'pembina'
                            && item.metadata?.is_self_added
                            && !item.metadata?.is_quest
                            && !item.metadata?.has_bonus
                            && item.metadata?.activity_id
                            && item.metadata?.completion_id && (
                            <button
                              onClick={() => {
                                setBonusModal({
                                  activityId: item.metadata.activity_id,
                                  activityTitle: item.title.replace(/^Tugas Selesai:\s*/, ''),
                                  completionId: item.metadata.completion_id
                                });
                                setBonusXp(20);
                                setBonusNote('');
                                setBonusError('');
                              }}
                              className="ml-auto flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-[10px] font-semibold"
                              title="Beri Bonus XP ke peserta untuk aktivitas ini"
                            >
                              <Gift className="w-3 h-3" /> +Bonus XP
                            </button>
                          )}
                        </div>
                      ) : item.type === 'task_daily_complete' ? (
                        <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-2">
                          {item.metadata?.exp_awarded !== undefined && (
                            <span className="text-bpjs-green font-medium">+{item.metadata.exp_awarded} EXP</span>
                          )}
                          {item.metadata?.bonus_exp_awarded > 0 && (
                            <span className="text-amber-600 font-medium">+{item.metadata.bonus_exp_awarded} bonus</span>
                          )}
                          {item.metadata?.completion_date && (
                            <span>Tanggal: {item.metadata.completion_date}</span>
                          )}
                        </div>
                      ) : item.type === 'quest' ? (
                        <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-2">
                          <span className="capitalize">Status: {item.metadata?.status}</span>
                          {item.metadata?.xp_awarded > 0 ? (
                            <span className="text-bpjs-green font-medium">+{item.metadata.xp_awarded} EXP</span>
                          ) : item.metadata?.xp_reward ? (
                            <span className="text-bpjs-green font-medium">+{item.metadata.xp_reward} EXP</span>
                          ) : null}
                        </div>
                      ) : item.type === 'leave' ? (
                        <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-2">
                          <span className={`capitalize font-medium ${
                            item.metadata?.status === 'approved' ? 'text-bpjs-green'
                            : item.metadata?.status === 'rejected' ? 'text-red-600'
                            : 'text-yellow-700'
                          }`}>
                            {item.metadata?.status === 'approved' ? '✓ Disetujui'
                            : item.metadata?.status === 'rejected' ? '✗ Ditolak'
                            : '⏳ Pending'}
                          </span>
                          {item.metadata?.review_notes && (
                            <span className="italic">Catatan: {item.metadata.review_notes}</span>
                          )}
                        </div>
                      ) : item.type === 'certificate' ? (
                        <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-2">
                          {item.metadata?.official_name && (
                            <span>OLEH: {item.metadata.official_name}</span>
                          )}
                          {item.metadata?.official_position && (
                            <span>({item.metadata.official_position})</span>
                          )}
                        </div>
                      ) : item.type === 'bonus_xp' ? (
                        <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-2">
                          {item.metadata?.bonus_xp > 0 && (
                            <span className="text-amber-600 font-medium">+{item.metadata.bonus_xp} XP</span>
                          )}
                          {item.metadata?.pembina_name && (
                            <span>Dari: {item.metadata.pembina_name}</span>
                          )}
                          {item.metadata?.quest_title && (
                            <span>Quest: {item.metadata.quest_title}</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer: groups */}
      {data.groups && data.groups.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-bpjs-blue" />
            <h2
              className="text-lg font-bold text-gray-900"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Keanggotaan Grup
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.groups.map((g: any) => (
              <span
                key={g.id}
                className={`text-xs px-3 py-1.5 rounded-full ${
                  g.group_type === 'system' ? 'bg-bpjs-blue/10 text-bpjs-blue' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {g.name}
                {g.department && ` (${g.department})`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Modal Bonus XP — untuk aktivitas self-added (pembina only) */}
      {bonusModal && viewerRole === 'pembina' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-600" /> Bonus XP untuk Aktivitas
              </h3>
              <button
                onClick={() => setBonusModal(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium mb-1">Aktivitas: {bonusModal.activityTitle}</p>
                <p className="text-xs">Bonus XP ini diberikan sebagai apresiasi atas inisiatif peserta menambah aktivitas sendiri. Akan tercatat di audit trail & notifikasi ke peserta.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus XP (1-100) *</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[10, 20, 30, 50].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBonusXp(v)}
                      className={`py-2 rounded-lg text-sm font-semibold ${
                        bonusXp === v
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      +{v}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bonusXp}
                  onChange={(e) => setBonusXp(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea
                  rows={2}
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                  placeholder="Misal: Inisiatif bagus, kerja lengkap, dll."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {bonusError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-sm">{bonusError}</div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setBonusModal(null)}
                  disabled={bonusLoading}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    setBonusLoading(true);
                    setBonusError('');
                    try {
                      const res = await fetch(`/api/activities/${bonusModal.activityId}/bonus-xp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          bonus_xp: bonusXp,
                          note: bonusNote.trim() || undefined
                        })
                      });
                      const d = await res.json();
                      if (!res.ok) throw new Error(d.error);
                      // Refresh data
                      setBonusModal(null);
                      // Refetch timeline
                      fetch(`/api/admin/interns/${internId}/timeline`)
                        .then((r) => r.json())
                        .then((d) => { if (d.success) setData(d); })
                        .catch(() => {});
                    } catch (err: any) {
                      setBonusError(err.message);
                    } finally {
                      setBonusLoading(false);
                    }
                  }}
                  disabled={bonusLoading || bonusXp < 1 || bonusXp > 100}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {bonusLoading ? '...' : <><Gift className="w-4 h-4" /> Berikan +{bonusXp} XP</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
