'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  Plus,
  X,
  Wand2,
  Target,
  Clock,
  Zap
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import QuestCard from './QuestCard';

interface ChatMessage {
  id: string;
  sender_type: string;
  sender_id: string;
  sender_name: string;
  message_type: string;
  content: string;
  quest_id: string | null;
  quest: any;
  my_quest_log: any;
  quest_logs: any[];
  created_at: string;
}

interface ChatRoomProps {
  groupId: string;
  userRole: 'pembina' | 'peserta' | 'admin';
  backHref: string;
}

// ============================================================
// Realtime Supabase client (browser-side, anon key)
// ============================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
let realtimeClient: any = null;
function getRealtimeClient() {
  if (!realtimeClient && supabaseUrl && supabaseAnonKey) {
    realtimeClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } }
    });
  }
  return realtimeClient;
}

export default function ChatRoom({ groupId, userRole, backHref }: ChatRoomProps) {
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [showDeployForm, setShowDeployForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages?group_id=${groupId}&limit=100`);
      const data = await res.json();
      if (data.success) setMessages(data.messages || []);
    } catch (e) {}
  }, [groupId]);

  const fetchData = useCallback(async () => {
    try {
      const [groupRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`).then((r) => r.json()),
        fetchMessages()
      ]);
      if (groupRes.success) {
        setGroup(groupRes.group);
        setMembers(groupRes.members || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [groupId, fetchMessages]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============================================================
  // REALTIME: Subscribe ke chat_messages table changes
  // Trigger fetchMessages ulang kalau ada INSERT baru di grup ini
  // ============================================================
  useEffect(() => {
    const client = getRealtimeClient();
    if (!client) {
      // Fallback ke polling kalau Supabase URL/anon key tidak ada
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }

    const channel = client
      .channel(`chat_group_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          // Refetch messages saat ada pesan baru
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quest_logs',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          // Refetch saat quest_log berubah (start/submit)
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [groupId, fetchMessages]);

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, content: input.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInput('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleStartQuest = async (questId: string) => {
    setError('');
    try {
      const res = await fetch('/api/quests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: questId, group_id: groupId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitQuest = async (questId: string, notes: string) => {
    setError('');
    try {
      const res = await fetch('/api/quests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: questId, group_id: groupId, submission_notes: notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  if (!group) {
    return <div className="text-center py-12 text-gray-500">Grup tidak ditemukan</div>;
  }

  const pembinaMembers = members.filter((m) => m.user_type === 'pembina');
  const pesertaMembers = members.filter((m) => m.user_type === 'peserta');

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Back button */}
      <button onClick={() => router.push(backHref)} className="inline-flex items-center gap-1 text-gray-500 hover:text-purple-600 text-sm">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Header grup */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-purple-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {group.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {pembinaMembers.length} pembina • {pesertaMembers.length} peserta
              {group.department && ` • ${group.department}`}
            </p>
          </div>
          {userRole === 'pembina' && (
            <button
              onClick={() => setShowDeployForm(true)}
              className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-3 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" /> Deploy Quest
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Chat messages */}
      <div className="bg-white rounded-2xl border border-gray-200 flex flex-col" style={{ height: '60vh', minHeight: '400px' }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Belum ada pesan. Mulai percakapan!</p>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.message_type === 'system') {
                return (
                  <div key={msg.id} className="text-center">
                    <span className="inline-block text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }
              if (msg.message_type === 'quest_card') {
                return (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-purple-700" />
                    </div>
                    <div className="flex-1 max-w-2xl">
                      <p className="text-xs text-gray-500 mb-1">{msg.sender_name} mendeploy quest:</p>
                      <QuestCard
                        quest={msg.quest}
                        myQuestLog={msg.my_quest_log}
                        questLogs={msg.quest_logs}
                        userRole={userRole}
                        onStart={() => handleStartQuest(msg.quest_id!)}
                        onSubmit={(notes) => handleSubmitQuest(msg.quest_id!, notes)}
                      />
                    </div>
                  </div>
                );
              }
              // Regular text message
              const isOwn = (userRole === 'pembina' && msg.sender_type === 'pembina') || (userRole === 'peserta' && msg.sender_type === 'peserta');
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender_type === 'pembina' ? 'bg-purple-100' : msg.sender_type === 'admin' ? 'bg-bpjs-blue/10' : 'bg-bpjs-green/10'
                  }`}>
                    <span className={`text-xs font-bold ${
                      msg.sender_type === 'pembina' ? 'text-purple-700' : msg.sender_type === 'admin' ? 'text-bpjs-blue' : 'text-bpjs-green'
                    }`}>{(msg.sender_name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className={`max-w-[75%] ${isOwn ? 'items-end' : ''}`}>
                    <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-medium text-gray-700">{msg.sender_name}</span>
                      <span className="text-[10px] text-gray-400">
                        {msg.sender_type === 'pembina' ? 'Pembina' : msg.sender_type === 'admin' ? 'Admin' : 'Peserta'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${
                      isOwn
                        ? 'bg-purple-600 text-white rounded-tr-sm'
                        : msg.sender_type === 'pembina'
                        ? 'bg-purple-50 text-gray-800 rounded-tl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-gray-100 p-3 flex gap-2 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pesan..."
            maxLength={2000}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-2 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Deploy Quest Modal */}
      {showDeployForm && (
        <DeployQuestModal
          groupId={groupId}
          onClose={() => setShowDeployForm(false)}
          onSuccess={() => { setShowDeployForm(false); fetchData(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// DeployQuestModal — pembina buat quest baru
// ============================================================
function DeployQuestModal({ groupId, onClose, onSuccess }: { groupId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    xp_reward: '20',
    deadline: '',
    deadline_time: '17:00',
    max_slots: '',
    // Recurring fields (gaya hotel)
    is_recurring: false,
    start_date: '',
    end_date: '',
    skip_weekend: true,
    daily_deadline_hour: '17'
  });
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState('');

  const handleCompose = async () => {
    if (!form.title.trim()) { setError('Isi judul dulu'); return; }
    setComposing(true);
    setError('');
    try {
      const res = await fetch('/api/activities/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ ...form, description: data.description });
    } catch (err: any) {
      setError('AI compose gagal: ' + err.message);
    } finally {
      setComposing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let deadlineISO: string | undefined;
      if (form.deadline) {
        deadlineISO = new Date(`${form.deadline}T${form.deadline_time}:00`).toISOString();
      }
      const res = await fetch('/api/quests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          group_id: groupId,
          xp_reward: parseInt(form.xp_reward, 10) || 20,
          deadline: deadlineISO,
          max_slots: form.max_slots ? parseInt(form.max_slots, 10) : null,
          // Recurring fields
          is_recurring: form.is_recurring,
          start_date: form.is_recurring ? form.start_date : undefined,
          end_date: form.is_recurring ? form.end_date : undefined,
          skip_weekend: form.skip_weekend,
          daily_deadline_hour: parseInt(form.daily_deadline_hour, 10)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" /> Deploy Quest Baru
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Quest *</label>
            <div className="flex gap-2">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Verifikasi 10 Dokumen JHT"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
              <button
                type="button"
                onClick={handleCompose}
                disabled={composing || !form.title.trim()}
                title="AI generate deskripsi dari judul"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
              >
                {composing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {composing ? '...' : 'Magic ✨'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Langkah-langkah pengerjaan quest..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XP Reward</label>
              <select value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                <option value="10">10 XP (Easy)</option>
                <option value="20">20 XP (Medium)</option>
                <option value="30">30 XP (Hard)</option>
                <option value="50">50 XP (Expert)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Slots (opsional)</label>
              <input
                type="number"
                min={1}
                value={form.max_slots}
                onChange={(e) => setForm({ ...form, max_slots: e.target.value })}
                placeholder="kosong = unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
          </div>

          {/* Mode: Sekali Selesai vs Harian Berulang (gaya hotel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mode Quest</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => setForm({ ...form, is_recurring: false })}
                className={`p-3 rounded-lg border text-left ${!form.is_recurring ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                <div className="font-semibold text-sm">📋 Sekali Selesai</div>
                <div className="text-xs text-gray-500 mt-0.5">Kerjakan 1x, dapat XP sekali</div>
              </button>
              <button type="button" onClick={() => setForm({ ...form, is_recurring: true })}
                className={`p-3 rounded-lg border text-left ${form.is_recurring ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                <div className="font-semibold text-sm">🔁 Harian Berulang</div>
                <div className="text-xs text-gray-500 mt-0.5">Muncul tiap hari di rentang, +XP/hari</div>
              </button>
            </div>
          </div>

          {form.is_recurring ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">📅 Rentang Tanggal *</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-500">Mulai</span>
                    <input type="date" required={form.is_recurring} value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500">Selesai</span>
                    <input type="date" required={form.is_recurring} value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="skip_weekend_quest" checked={form.skip_weekend}
                  onChange={(e) => setForm({ ...form, skip_weekend: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <label htmlFor="skip_weekend_quest" className="text-xs text-gray-700">Skip weekend (Sabtu & Minggu tidak muncul)</label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">⏰ Deadline Harian (WIB)</label>
                <select value={form.daily_deadline_hour} onChange={(e) => setForm({ ...form, daily_deadline_hour: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                  {[15, 16, 17, 18, 19, 20].map((h) => (
                    <option key={h} value={h}>{h}:00 WIB</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-0.5">Peserta harus complete sebelum jam ini setiap hari</p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (opsional)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                <select value={form.deadline_time} onChange={(e) => setForm({ ...form, deadline_time: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                  {['12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} Deploy Quest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
