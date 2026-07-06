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
  Zap,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  XCircle,
  Trash2,
  AlertTriangle,
  Edit2,
  Archive,
  RotateCcw,
  Ban,
  Megaphone
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
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_filename?: string | null;
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
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; filename: string; type: string; file: File } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showClearFiles, setShowClearFiles] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);
  // Quest management state
  const [editingQuest, setEditingQuest] = useState<any>(null);
  const [archivingQuest, setArchivingQuest] = useState<any>(null);
  const [deletingQuest, setDeletingQuest] = useState<any>(null);
  const [forceCancelQuest, setForceCancelQuest] = useState<any>(null);
  const [restoringQuest, setRestoringQuest] = useState<any>(null);
  const [questActionLoading, setQuestActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);  // UUID pembina/admin saat ini
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch current user ID (untuk menentukan canManage di QuestCard)
  // Hanya perlu untuk pembina — admin selalu canManage=true
  useEffect(() => {
    if (userRole === 'pembina') {
      fetch('/api/pembina/me')
        .then((r) => r.json())
        .then((d) => { if (d.success && d.pembina?.id) setCurrentUserId(d.pembina.id); })
        .catch(() => {});
    }
  }, [userRole]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10MB');
      return;
    }
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('image/') ? 'image' : 'document';
    setAttachmentPreview({ url, filename: file.name, type, file });
    setError('');
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachmentPreview) || sending || uploading) return;
    setSending(true);
    setError('');
    try {
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      let attachmentFilename: string | null = null;

      // Upload attachment if exists
      if (attachmentPreview) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', attachmentPreview.file);
        const uploadRes = await fetch('/api/chat/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        setUploading(false);
        if (!uploadRes.ok) throw new Error(uploadData.error);
        attachmentUrl = uploadData.url;
        attachmentType = uploadData.type;
        attachmentFilename = uploadData.filename;
      }

      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          content: input.trim() || undefined,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_filename: attachmentFilename
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInput('');
      setAttachmentPreview(null);
      await fetchMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleClearFiles = async () => {
    if (clearConfirmText !== 'HAPUS') return;
    setClearing(true);
    setError('');
    try {
      const res = await fetch('/api/chat/clear-attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowClearFiles(false);
      setClearConfirmText('');
      await fetchMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClearing(false);
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

  // ============================================================
  // Quest management handlers (edit/archive/restore/force-cancel/delete)
  // ============================================================
  const handleArchiveQuest = async (questId: string, reason: string) => {
    setQuestActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quests/${questId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setArchivingQuest(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuestActionLoading(false);
    }
  };

  const handleRestoreQuest = async (questId: string) => {
    setQuestActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quests/${questId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestoringQuest(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuestActionLoading(false);
    }
  };

  const handleForceCancelQuest = async (questId: string, reason: string) => {
    setQuestActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quests/${questId}/force-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForceCancelQuest(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuestActionLoading(false);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    setQuestActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'DELETE',
        headers: { 'x-confirm': 'HAPUS' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeletingQuest(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuestActionLoading(false);
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
      <div className={`rounded-2xl border p-4 sm:p-5 relative overflow-hidden ${
        group.group_type === 'system' && group.name === 'All Peserta Magang'
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-50 to-yellow-50'
          : 'border-gray-200 bg-white'
      }`}>
        {/* Ornamen mading: stripes halus */}
        {group.group_type === 'system' && group.name === 'All Peserta Magang' && (
          <>
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b 0, #f59e0b 1px, transparent 0, transparent 50%)',
                backgroundSize: '8px 8px'
              }}
            />
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
              <Megaphone className="w-2.5 h-2.5" /> Mading Pengumuman
            </div>
          </>
        )}
        <div className="flex items-start gap-3 flex-wrap relative">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            group.group_type === 'system' && group.name === 'All Peserta Magang'
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30'
              : 'bg-gradient-to-br from-purple-100 to-purple-50'
          }`}>
            {group.group_type === 'system' && group.name === 'All Peserta Magang' ? (
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {group.group_type === 'system' && group.name === 'All Peserta Magang'
                ? 'Mading Pengumuman Kantor'
                : group.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {group.group_type === 'system' && group.name === 'All Peserta Magang' ? (
                <>Pengumuman resmi dari admin & pembina • {pembinaMembers.length} pembina • {pesertaMembers.length} peserta</>
              ) : (
                <>{pembinaMembers.length} pembina • {pesertaMembers.length} peserta{group.department && ` • ${group.department}`}</>
              )}
            </p>
          </div>
          {userRole === 'pembina' && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowDeployForm(true)}
                className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-3 py-2 rounded-lg"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Deploy Quest</span><span className="sm:hidden">Quest</span>
              </button>
              <button
                onClick={() => setShowClearFiles(true)}
                className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg"
                title="Hapus semua file dari grup (hemat storage)"
              >
                <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Clear File</span>
              </button>
            </div>
          )}
          {userRole === 'admin' && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowDeployForm(true)}
                className="inline-flex items-center gap-1 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white text-sm font-semibold px-3 py-2 rounded-lg"
                title="Deploy quest ke grup ini (broadcast tugas dari admin)"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Deploy Quest</span><span className="sm:hidden">Quest</span>
              </button>
              <button
                onClick={() => setShowClearFiles(true)}
                className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg"
                title="Hapus semua file dari grup (hemat storage)"
              >
                <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Clear File</span>
              </button>
            </div>
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
                // canManage: admin (selalu), pembina (creator quest)
                const questCreatorId = msg.quest?.created_by_pembina_id;
                const canManage = userRole === 'admin' || (userRole === 'pembina' && !!currentUserId && currentUserId === questCreatorId);
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
                        canManage={canManage}
                        onStart={() => handleStartQuest(msg.quest_id!)}
                        onSubmit={(notes) => handleSubmitQuest(msg.quest_id!, notes)}
                        onBonusXpGiven={fetchMessages}
                        onEdit={() => setEditingQuest(msg.quest)}
                        onArchive={() => setArchivingQuest(msg.quest)}
                        onRestore={() => setRestoringQuest(msg.quest)}
                        onForceCancel={() => setForceCancelQuest(msg.quest)}
                        onDelete={() => setDeletingQuest(msg.quest)}
                      />
                    </div>
                  </div>
                );
              }
              // Regular message (text, image, or document)
              const isOwn = (userRole === 'pembina' && msg.sender_type === 'pembina')
                          || (userRole === 'peserta' && msg.sender_type === 'peserta')
                          || (userRole === 'admin' && msg.sender_type === 'admin');
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

                    {/* Image message */}
                    {msg.message_type === 'image' && msg.attachment_url && (
                      <div className={`rounded-2xl overflow-hidden ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${
                        isOwn
                          ? (msg.sender_type === 'admin' ? 'bg-bpjs-blue' : msg.sender_type === 'pembina' ? 'bg-purple-600' : 'bg-bpjs-green')
                          : msg.sender_type === 'pembina' ? 'bg-purple-50' : 'bg-gray-100'
                      }`}>
                        <img
                          src={msg.attachment_url}
                          alt={msg.attachment_filename || 'Image'}
                          className="max-w-[280px] max-h-[280px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setZoomImage(msg.attachment_url || null)}
                        />
                        {msg.content && (
                          <p className={`px-3 py-2 text-sm whitespace-pre-line ${isOwn ? 'text-white' : 'text-gray-800'}`}>{msg.content}</p>
                        )}
                      </div>
                    )}

                    {/* Document message */}
                    {msg.message_type === 'document' && msg.attachment_url && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl ${isOwn ? `rounded-tr-sm ${msg.sender_type === 'admin' ? 'bg-bpjs-blue' : msg.sender_type === 'pembina' ? 'bg-purple-600' : 'bg-bpjs-green'}` : 'rounded-tl-sm bg-gray-100'} hover:opacity-90 transition-opacity`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isOwn ? 'bg-white/20' : 'bg-white'
                        }`}>
                          <FileText className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-800'}`}>
                            {msg.attachment_filename || 'Document'}
                          </p>
                          <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-500'} flex items-center gap-1`}>
                            <Download className="w-3 h-3" /> Klik untuk download/buka
                          </p>
                        </div>
                      </a>
                    )}

                    {/* Text message, or [File dihapus] if content is null */}
                    {(msg.message_type === 'text' || (!msg.attachment_url && msg.content)) && (
                      <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${
                        isOwn
                          ? `${msg.sender_type === 'admin' ? 'bg-bpjs-blue' : msg.sender_type === 'pembina' ? 'bg-purple-600' : 'bg-bpjs-green'} text-white rounded-tr-sm`
                          : msg.sender_type === 'pembina'
                          ? 'bg-purple-50 text-gray-800 rounded-tl-sm'
                          : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      }`}>
                        {msg.content || <span className="italic opacity-50">📎 [File dihapus]</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Attachment preview (if file selected) */}
        {attachmentPreview && (
          <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
            <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
              {attachmentPreview.type === 'image' ? (
                <img src={attachmentPreview.url} alt="preview" className="w-12 h-12 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{attachmentPreview.filename}</p>
                <p className="text-[10px] text-gray-400">{attachmentPreview.type === 'image' ? '🖼️ Image' : '📄 Document'}</p>
              </div>
              <button
                type="button"
                onClick={() => { setAttachmentPreview(null); setInput(''); }}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Caption (opsional)..."
              maxLength={2000}
              className="w-full mt-2 px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-gray-100 p-3 flex gap-2 items-end">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* Paperclip button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!attachmentPreview || uploading}
            className="p-2 text-gray-500 hover:text-purple-600 disabled:opacity-30 flex-shrink-0"
            title="Kirim foto atau dokumen"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          {/* Text input (hidden if attachment preview is showing with caption) */}
          {!attachmentPreview && (
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pesan..."
              maxLength={2000}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          )}
          {attachmentPreview && <div className="flex-1" />}
          <button
            type="submit"
            disabled={sending || uploading || (!input.trim() && !attachmentPreview)}
            className={`${userRole === 'admin' ? 'bg-bpjs-blue hover:bg-bpjs-blue-dark' : userRole === 'peserta' ? 'bg-bpjs-green hover:bg-bpjs-green-dark' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg p-2 disabled:opacity-50 flex-shrink-0`}
          >
            {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Clear Files confirmation modal */}
      {showClearFiles && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Hapus Semua File
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-1">
                <p>• Semua <strong>foto dan document</strong> akan dihapus permanen dari storage</p>
                <p>• <strong>Pesan chat tetap ada</strong> (text tidak hilang)</p>
                <p>• Tindakan ini <strong>TIDAK BISA dibatalkan</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ketik <strong className="text-red-600">HAPUS</strong> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={clearConfirmText}
                  onChange={(e) => setClearConfirmText(e.target.value)}
                  placeholder="HAPUS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => { setShowClearFiles(false); setClearConfirmText(''); setError(''); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleClearFiles}
                disabled={clearConfirmText !== 'HAPUS' || clearing}
                className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-40"
              >
                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Hapus File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image zoom modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white z-10">
            <X className="w-8 h-8" />
          </button>
          <img
            src={zoomImage}
            alt="Zoom"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Deploy Quest Modal */}
      {showDeployForm && (userRole === 'pembina' || userRole === 'admin') && (
        <DeployQuestModal
          groupId={groupId}
          userRole={userRole}
          onClose={() => setShowDeployForm(false)}
          onSuccess={() => { setShowDeployForm(false); fetchData(); }}
        />
      )}

      {/* Edit Quest Modal */}
      {editingQuest && (
        <EditQuestModal
          quest={editingQuest}
          onClose={() => setEditingQuest(null)}
          onSuccess={() => { setEditingQuest(null); fetchData(); }}
        />
      )}

      {/* Archive confirmation */}
      {archivingQuest && (
        <ArchiveQuestModal
          quest={archivingQuest}
          loading={questActionLoading}
          onClose={() => setArchivingQuest(null)}
          onConfirm={(reason) => handleArchiveQuest(archivingQuest.id, reason)}
        />
      )}

      {/* Restore confirmation (admin only) */}
      {restoringQuest && (
        <SimpleConfirmModal
          title="Restore Quest"
          message={`Restore quest "${restoringQuest.title}"? Quest akan aktif kembali${restoringQuest.due_date && new Date(restoringQuest.due_date).getTime() < Date.now() ? ' (catatan: deadline sudah lewat, quest tetap nonaktif)' : ' dan bisa diambil peserta'}.`}
          confirmText="Restore"
          confirmColor="green"
          loading={questActionLoading}
          onClose={() => setRestoringQuest(null)}
          onConfirm={() => handleRestoreQuest(restoringQuest.id)}
        />
      )}

      {/* Force-cancel confirmation */}
      {forceCancelQuest && (
        <ForceCancelModal
          quest={forceCancelQuest}
          loading={questActionLoading}
          onClose={() => setForceCancelQuest(null)}
          onConfirm={(reason) => handleForceCancelQuest(forceCancelQuest.id, reason)}
        />
      )}

      {/* Delete permanent confirmation (admin only) */}
      {deletingQuest && (
        <DeleteQuestModal
          quest={deletingQuest}
          loading={questActionLoading}
          onClose={() => setDeletingQuest(null)}
          onConfirm={() => handleDeleteQuest(deletingQuest.id)}
        />
      )}
    </div>
  );
}

// ============================================================
// DeployQuestModal — pembina ATAU admin buat quest baru
// ============================================================
function DeployQuestModal({ groupId, onClose, onSuccess, userRole = 'pembina' }: { groupId: string; onClose: () => void; onSuccess: () => void; userRole?: 'pembina' | 'admin' }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    // xp_reward TIDAK lagi bisa di-set pembina — default 20 XP (medium)
    // Pembina bisa kasih Bonus XP setelah peserta submit quest (lihat QuestCard)
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
          // xp_reward default 20 XP — backend tetap terima param tapi default 20
          // (jika dikirim null/undefined, backend akan pakai default 20)
          xp_reward: 20,
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
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl mx-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className={`w-5 h-5 ${userRole === 'admin' ? 'text-bpjs-blue' : 'text-purple-600'}`} />
            Deploy Quest Baru
            {userRole === 'admin' && (
              <span className="text-[10px] px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full font-medium">ADMIN</span>
            )}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Quest *</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Verifikasi 10 Dokumen JHT"
                className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
              <button
                type="button"
                onClick={handleCompose}
                disabled={composing || !form.title.trim()}
                title="AI generate deskripsi dari judul"
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XP Reward (default)</label>
              <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-bpjs-yellow" />
                <span className="font-semibold">20 XP</span>
                <span className="text-xs text-gray-500 ml-auto">+ Bonus dari pembina</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Setelah peserta submit, Anda bisa kasih Bonus XP (1-100) jika kerja luar biasa.
              </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                <select value={form.deadline_time} onChange={(e) => setForm({ ...form, deadline_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                  {['12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
            <button type="submit" disabled={loading} className={`flex-1 inline-flex items-center justify-center gap-2 ${userRole === 'admin' ? 'bg-bpjs-blue hover:bg-bpjs-blue-dark' : 'bg-purple-600 hover:bg-purple-700'} text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} Deploy Quest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// EditQuestModal — Edit quest yang sudah di-deploy
// Pembina (creator) atau Admin. Restrict: XP tidak bisa diubah jika sudah ada peserta ambil
// ============================================================
function EditQuestModal({ quest, onClose, onSuccess }: { quest: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: quest.title || '',
    description: quest.description || '',
    xp_reward: String(quest.xp_reward || 20),
    deadline: quest.due_date ? new Date(quest.due_date).toISOString().slice(0, 10) : '',
    deadline_time: quest.due_date ? new Date(quest.due_date).toISOString().slice(11, 16) : '17:00',
    max_slots: quest.max_slots ? String(quest.max_slots) : ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restrictions, setRestrictions] = useState<{ xpLocked: boolean; titleLocked: boolean }>({
    xpLocked: false,
    titleLocked: false
  });

  // Cek restrictions saat mount
  useEffect(() => {
    fetch(`/api/quests/list?group_id=${quest.group_id}`)
      .then((r) => r.json())
      .then(() => {
        // Cek dari quest_logs di quest object (kalau ada quest_logs)
        const hasSubmission = quest.quest_logs && quest.quest_logs.some((l: any) => l.status === 'in_progress' || l.status === 'completed');
        const hasCompleted = quest.quest_logs && quest.quest_logs.some((l: any) => l.status === 'completed');
        setRestrictions({
          xpLocked: !!hasSubmission,
          titleLocked: !!hasCompleted
        });
      })
      .catch(() => {});
  }, [quest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let deadlineISO: string | null = null;
      if (form.deadline) {
        deadlineISO = new Date(`${form.deadline}T${form.deadline_time}:00`).toISOString();
      }
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        deadline: deadlineISO,
        max_slots: form.max_slots ? parseInt(form.max_slots, 10) : null
      };
      if (!restrictions.xpLocked) {
        payload.xp_reward = parseInt(form.xp_reward, 10) || 20;
      }
      const res = await fetch(`/api/quests/${quest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
            <Edit2 className="w-5 h-5 text-purple-600" /> Edit Quest
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Quest *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={restrictions.titleLocked}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {restrictions.titleLocked && <p className="text-xs text-orange-600 mt-1">Judul terkunci karena sudah ada peserta yang menyelesaikan quest.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XP Reward</label>
              <select
                value={form.xp_reward}
                onChange={(e) => setForm({ ...form, xp_reward: e.target.value })}
                disabled={restrictions.xpLocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="10">10 XP (Easy)</option>
                <option value="20">20 XP (Medium)</option>
                <option value="30">30 XP (Hard)</option>
                <option value="50">50 XP (Expert)</option>
              </select>
              {restrictions.xpLocked && <p className="text-xs text-orange-600 mt-1">XP terkunci (anti-fraud) — sudah ada peserta yang ambil.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Slots</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
              <select value={form.deadline_time} onChange={(e) => setForm({ ...form, deadline_time: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                {['12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">Kosongkan untuk hapus deadline.</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            ℹ️ Perubahan akan tersimpan ke audit log dan broadcast system message ke chat grup ini.
          </div>

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />} Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ArchiveQuestModal — konfirmasi arsip quest
// ============================================================
function ArchiveQuestModal({ quest, loading, onClose, onConfirm }: { quest: any; loading: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Archive className="w-5 h-5 text-gray-600" /> Arsipkan Quest
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            Anda akan mengarsipkan quest <strong className="text-gray-900">&ldquo;{quest.title}&rdquo;</strong>.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-1">
            <p>📦 Quest disembunyikan dari peserta baru</p>
            <p>✅ Peserta yang sudah ambil tetap melihat history</p>
            <p>💎 EXP tetap aman (tidak di-revoke)</p>
            <p>♻️ Hanya admin yang bisa restore</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alasan (opsional)</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Misal: Quest sudah tidak relevan, salah deploy, dll."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">Batal</button>
            <button onClick={() => onConfirm(reason)} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />} Arsipkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ForceCancelModal — konfirmasi batalkan peserta in_progress
// ============================================================
function ForceCancelModal({ quest, loading, onClose, onConfirm }: { quest: any; loading: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const inProgressCount = (quest.quest_logs || []).filter((l: any) => l.status === 'in_progress').length;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2">
            <Ban className="w-5 h-5" /> Batalkan Peserta In-Progress
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            Batalkan <strong className="text-orange-700">{inProgressCount} peserta</strong> yang sedang mengerjakan quest <strong className="text-gray-900">&ldquo;{quest.title}&rdquo;</strong>?
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 space-y-1">
            <p>🚫 Peserta in_progress → status &ldquo;cancelled&rdquo;</p>
            <p>❌ EXP tidak diberikan ke peserta yang belum submit</p>
            <p>✅ Peserta yang sudah completed tetap dapat EXP</p>
            <p>⛔ Quest dinonaktifkan (tidak bisa diambil lagi)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alasan (wajib, min 5 karakter) *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Misal: Quest salah total, ada bug di instruksi, perlu recall"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">Batal</button>
            <button onClick={() => onConfirm(reason)} disabled={loading || reason.trim().length < 5} className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Batalkan {inProgressCount} Peserta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DeleteQuestModal — konfirmasi hapus permanen (admin only)
// ============================================================
function DeleteQuestModal({ quest, loading, onClose, onConfirm }: { quest: any; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const match = confirmText === 'HAPUS';
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-red-100">
          <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Hapus Permanen Quest
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <p className="font-semibold mb-1">⚠️ Aksi ini tidak bisa di-undo</p>
            <p>Quest <strong>&ldquo;{quest.title}&rdquo;</strong> akan dihapus permanen dari database.</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-1">
            <p>🗑️ Semua quest_logs & activity_completions dihapus</p>
            <p>🗑️ Chat quest_card di grup akan dihapus</p>
            <p>📝 Audit log tetap tersimpan (untuk audit trail)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ketik <strong className="text-red-600">HAPUS</strong> untuk konfirmasi *
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="HAPUS"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">Batal</button>
            <button onClick={onConfirm} disabled={loading || !match} className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Hapus Permanen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SimpleConfirmModal — konfirmasi sederhana (untuk restore)
// ============================================================
function SimpleConfirmModal({
  title,
  message,
  confirmText,
  confirmColor,
  loading,
  onClose,
  onConfirm
}: {
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'green' | 'blue' | 'orange';
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const colorClasses = {
    green: 'bg-bpjs-green hover:bg-bpjs-green-dark',
    blue: 'bg-bpjs-blue hover:bg-bpjs-blue-dark',
    orange: 'bg-orange-600 hover:bg-orange-700'
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">{message}</p>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">Batal</button>
            <button onClick={onConfirm} disabled={loading} className={`flex-1 px-4 py-2 text-white font-semibold rounded-lg text-sm disabled:opacity-50 ${colorClasses[confirmColor]}`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
