'use client';

import { useState, useEffect } from 'react';
import {
  CheckSquare,
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  is_completed: boolean;
  my_completion: string | null;
  is_overdue: boolean;
  created_at: string;
}

export default function InternActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [recentExp, setRecentExp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activities/list');
      const data = await res.json();
      if (data.success) setActivities(data.activities || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleComplete = async (id: string) => {
    setCompleting(id);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/activities/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: id })
      });
      const data = await res.json();
      if (data.success) {
        setRecentExp(data.exp_gained);
        setTimeout(() => setRecentExp(null), 3000);
        fetchActivities();
      } else {
        setErrorMsg(data.error);
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" />
      </div>
    );
  }

  const pendingActivities = activities.filter((a) => !a.is_completed && !a.is_overdue);
  const completedActivities = activities.filter((a) => a.is_completed);
  const overdueActivities = activities.filter((a) => !a.is_completed && a.is_overdue);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Aktivitas Hari Ini
          </h1>
          <p className="text-sm text-white/60 mt-1">
            {pendingActivities.length} aktif • {completedActivities.length} selesai
          </p>
        </div>
        {recentExp && (
          <div className="inline-flex items-center gap-1 bg-bpjs-yellow text-bpjs-blue-dark px-3 py-1.5 rounded-full font-bold text-sm animate-bounce-small">
            <Zap className="w-4 h-4" /> +{recentExp} EXP
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="glass-card p-3 bg-red-500/10 border-red-400/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{errorMsg}</p>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <CheckSquare className="w-12 h-12 mx-auto text-white/30 mb-3" />
          <p className="text-white/60">Belum ada aktivitas yang ditugaskan ke kamu.</p>
          <p className="text-white/40 text-xs mt-1">Tunggu pembimbing assign aktivitas, atau hubungi kakak pembimbing kamu.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending activities */}
          {pendingActivities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-bpjs-yellow" />
                Aktif ({pendingActivities.length})
              </h2>
              {pendingActivities.map((act) => (
                <div key={act.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-white">{act.title}</h3>
                    {act.due_date && (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {new Date(act.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mb-3">{act.description}</p>
                  <button
                    onClick={() => handleComplete(act.id)}
                    disabled={completing === act.id}
                    className="w-full flex items-center justify-center gap-2 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {completing === act.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Tandai Selesai (+20 EXP)
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Overdue activities */}
          {overdueActivities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Lewat Deadline ({overdueActivities.length})
              </h2>
              {overdueActivities.map((act) => (
                <div key={act.id} className="glass-card p-4 opacity-60 border-red-400/30">
                  <h3 className="font-bold text-white mb-1">{act.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed mb-2">{act.description}</p>
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full font-medium">
                    Lewat deadline — hubungi pembimbing
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Completed activities */}
          {completedActivities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-bpjs-green flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Selesai ({completedActivities.length})
              </h2>
              {completedActivities.map((act) => (
                <div key={act.id} className="glass-card p-4 opacity-70">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-bpjs-green flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-white line-through opacity-60">{act.title}</h3>
                      <p className="text-xs text-white/50 mt-1">
                        Diselesaikan: {act.my_completion ? new Date(act.my_completion).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
