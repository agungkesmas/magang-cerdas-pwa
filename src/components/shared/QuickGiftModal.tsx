'use client';

import { useState, useEffect, useRef } from 'react';
import { Gift, X, Loader2, Zap, Clock, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface EligibleActivity {
  completion_id: string;
  activity_id: string;
  title: string;
  description: string;
  completed_at: string;
  xp_reward: number;
  is_self_added: boolean;
  department: string | null;
  completion_notes: string | null;
}

interface Intern {
  id: string;
  name: string;
  department: string;
  total_exp: number;
}

interface Props {
  internId: string;
  internName: string;
  onClose: () => void;
  onSuccess?: (totalExp: number) => void;
}

const QUICK_XP = [10, 20, 30, 50];

export default function QuickGiftModal({ internId, internName, onClose, onSuccess }: Props) {
  const [intern, setIntern] = useState<Intern | null>(null);
  const [activities, setActivities] = useState<EligibleActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);  // completion_id yang sedang submit
  const [successInfo, setSuccessInfo] = useState<{ xp: number; activityTitle: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/pembina/interns/${internId}/bonus-eligible-activities`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setIntern(d.intern);
          setActivities(d.eligible_activities || []);
          // Auto-expand aktivitas pertama (paling baru) untuk hemat klik
          if ((d.eligible_activities || []).length > 0) {
            setExpandedId(d.eligible_activities[0].completion_id);
          }
        } else {
          setError(d.error || 'Gagal memuat');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [internId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleQuickGift = async (activity: EligibleActivity, xp: number) => {
    setSubmitting(activity.completion_id);
    setError('');
    try {
      const res = await fetch(`/api/activities/${activity.activity_id}/bonus-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bonus_xp: xp })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      // Tampilkan sukses
      setSuccessInfo({ xp, activityTitle: activity.title });

      // Hapus aktivitas dari list (sudah dapat bonus)
      setActivities((prev) => prev.filter((a) => a.completion_id !== activity.completion_id));
      setExpandedId(null);

      // Update intern total_exp
      if (intern && d.new_total_exp) {
        setIntern({ ...intern, total_exp: d.new_total_exp });
      }

      // Notify parent
      onSuccess?.(d.new_total_exp);

      // Auto-close success setelah 1.5 detik kalau tidak ada aktivitas lain
      setTimeout(() => {
        setSuccessInfo(null);
      }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleCustomGift = async (activity: EligibleActivity, customXp: number) => {
    if (customXp < 1 || customXp > 100) {
      setError('Bonus XP harus 1-100');
      return;
    }
    await handleQuickGift(activity, customXp);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-yellow-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                Gift Bonus XP
              </h3>
              <p className="text-xs text-gray-600 truncate">
                ke <span className="font-semibold">{internName}</span>
                {intern && <span className="text-gray-400"> • {intern.total_exp} EXP</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 flex-shrink-0 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : error && !submitting ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Gagal memuat aktivitas</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600 font-medium">Tidak ada aktivitas eligible</p>
              <p className="text-xs text-gray-400 mt-1">
                Semua aktivitas peserta sudah dapat bonus, atau belum ada yang completed, atau semuanya quest/recurring.
              </p>
            </div>
          ) : (
            <>
              {/* Info banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-xs text-amber-800">
                💡 Klik aktivitas untuk expand, lalu klik XP cepat (10/20/30/50) untuk beri bonus langsung. Anti double-award: 1 bonus per aktivitas.
              </div>

              {/* List aktivitas */}
              <div className="space-y-2">
                {activities.map((act) => {
                  const isExpanded = expandedId === act.completion_id;
                  const isSubmitting = submitting === act.completion_id;
                  return (
                    <div
                      key={act.completion_id}
                      className={`border rounded-lg overflow-hidden transition-all ${
                        isExpanded ? 'border-amber-300 shadow-sm' : 'border-gray-200'
                      }`}
                    >
                      {/* Activity header — klik untuk expand */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : act.completion_id)}
                        disabled={!!submitting}
                        className="w-full text-left p-3 hover:bg-amber-50/50 disabled:opacity-50 flex items-start gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              act.is_self_added
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-bpjs-blue/10 text-bpjs-blue'
                            }`}>
                              {act.is_self_added ? 'Self-Added' : 'Departemen'}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> +{act.xp_reward} XP
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(act.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{act.title}</p>
                          {act.description && (
                            <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{act.description}</p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                        )}
                      </button>

                      {/* Expanded: Quick XP buttons */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 bg-amber-50/30 border-t border-amber-100">
                          <p className="text-[10px] text-gray-600 font-medium mb-2 mt-2">
                            Pilih Bonus XP:
                          </p>
                          <div className="grid grid-cols-4 gap-1.5 mb-2">
                            {QUICK_XP.map((xp) => (
                              <button
                                key={xp}
                                onClick={() => handleQuickGift(act, xp)}
                                disabled={!!submitting}
                                className="py-2 bg-amber-100 hover:bg-amber-500 hover:text-white text-amber-700 rounded-md text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-0.5"
                              >
                                {isSubmitting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>+{xp}</>
                                )}
                              </button>
                            ))}
                          </div>
                          {/* Custom XP */}
                          <CustomXpInput
                            onSubmit={(xp) => handleCustomGift(act, xp)}
                            disabled={!!submitting}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer — success toast overlay */}
        {successInfo && (
          <div className="absolute bottom-0 left-0 right-0 bg-bpjs-green text-white p-3 flex items-center gap-2 justify-center text-sm font-medium animate-in fade-in slide-in-from-bottom">
            <CheckCircle2 className="w-4 h-4" />
            +{successInfo.xp} XP berhasil diberikan untuk "{successInfo.activityTitle}"
          </div>
        )}

        {/* Error toast */}
        {error && submitting && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white p-3 flex items-center gap-2 justify-center text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CustomXpInput — input XP custom (1-100) dengan tombol submit
// ============================================================
function CustomXpInput({ onSubmit, disabled }: { onSubmit: (xp: number) => void; disabled: boolean }) {
  const [value, setValue] = useState('');

  return (
    <div className="flex gap-1.5">
      <input
        type="number"
        min={1}
        max={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Custom (1-100)"
        disabled={disabled}
        className="flex-1 px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <button
        onClick={() => {
          const xp = parseInt(value, 10);
          if (xp >= 1 && xp <= 100) {
            onSubmit(xp);
            setValue('');
          }
        }}
        disabled={disabled || !value || parseInt(value, 10) < 1 || parseInt(value, 10) > 100}
        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold disabled:opacity-50"
      >
        Beri
      </button>
    </div>
  );
}
