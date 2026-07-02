'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  ChevronDown
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface AIResepsionistProps {
  dashboard: 'admin' | 'bkk' | 'intern';
  welcomeName?: string;
  accentColor?: 'blue' | 'green' | 'purple';
}

const ACCENT_MAP = {
  blue: {
    btn: 'bg-bpjs-blue hover:bg-bpjs-blue-dark',
    header: 'bg-gradient-to-r from-bpjs-blue to-bpjs-blue-dark',
    bubble: 'bg-bpjs-blue/10 text-bpjs-blue-dark',
    send: 'bg-bpjs-blue hover:bg-bpjs-blue-dark'
  },
  green: {
    btn: 'bg-bpjs-green hover:bg-bpjs-green-dark',
    header: 'bg-gradient-to-r from-bpjs-green to-bpjs-green-dark',
    bubble: 'bg-bpjs-green/10 text-bpjs-green-dark',
    send: 'bg-bpjs-green hover:bg-bpjs-green-dark'
  },
  purple: {
    btn: 'bg-purple-600 hover:bg-purple-700',
    header: 'bg-gradient-to-r from-purple-600 to-purple-800',
    bubble: 'bg-purple-50 text-purple-900',
    send: 'bg-purple-600 hover:bg-purple-700'
  }
};

const DASHBOARD_LABEL = {
  admin: 'Admin BPJTK',
  bkk: 'Guru BKK',
  intern: 'Peserta Magang'
};

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  admin: [
    'Bagaimana cara tambah peserta magang?',
    'Cara batch upload Excel peserta?',
    'Bagaimana terima permintaan magang dari BKK?',
    'Cara terbitkan sertifikat?'
  ],
  bkk: [
    'Bagaimana cara ajukan permintaan magang?',
    'Di mana lihat data peserta saya?',
    'Cara lihat arsip sertifikat?',
    'Apa saja menu di dashboard BKK?'
  ],
  intern: [
    'Bagaimana cara check-in?',
    'Cara dapat EXP cepat?',
    'Kapan sertifikat terbuka?',
    'Cara ajukan izin sakit?'
  ]
};

export default function AIResepsionist({
  dashboard,
  welcomeName,
  accentColor = 'blue'
}: AIResepsionistProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const accent = ACCENT_MAP[accentColor];

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const greet = welcomeName
        ? `Halo ${welcomeName}! 👋 Saya **Pandai**, AI Resepsionis MAGANG-CERDAS. Saya siap bantu kamu navigasi dashboard ${DASHBOARD_LABEL[dashboard]}. Ada yang bisa saya bantu?`
        : `Halo! 👋 Saya **Pandai**, AI Resepsionis MAGANG-CERDAS. Saya siap bantu kamu navigasi dashboard ${DASHBOARD_LABEL[dashboard]}. Ada yang bisa saya bantu?`;
      setMessages([{ role: 'assistant', content: greet, ts: Date.now() }]);
    }
  }, [open, messages.length, dashboard, welcomeName]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: question.trim(), ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-resepsionis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboard,
          page: pathname,
          question: question.trim(),
          history: messages.map((m) => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.answer, ts: Date.now() }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'Maaf, terjadi kesalahan. Coba lagi ya.', ts: Date.now() }]);
      }
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Maaf, koneksi bermasalah. Coba lagi.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, dashboard, pathname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-6 right-6 z-40 ${accent.btn} text-white rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 px-4 py-3 group`}
          aria-label="Buka AI Resepsionis"
        >
          <div className="relative">
            <Sparkles className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <span className="font-semibold text-sm hidden sm:inline">Tanya Pandai</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden" style={{ height: 'min(70vh, 540px)' }}>
            {/* Header */}
            <div className={`${accent.header} text-white p-4 flex items-center justify-between flex-shrink-0`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">Pandai</p>
                  <p className="text-xs text-white/70 leading-tight">AI Resepsionis</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded p-1"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    m.role === 'user' ? 'bg-gray-300' : accent.bubble
                  }`}>
                    {m.role === 'user' ? <User className="w-4 h-4 text-gray-700" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-gray-700 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                    }`}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {formatMessage(m.content)}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${accent.bubble}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Suggested questions */}
              {showSuggestions && messages.length === 1 && !loading && (
                <div className="pt-2">
                  <p className="text-[10px] text-gray-400 mb-1.5 px-1">Pertanyaan populer:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_QUESTIONS[dashboard].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendQuestion(q)}
                        className="text-xs bg-white border border-gray-200 hover:border-gray-300 rounded-full px-2.5 py-1 text-gray-700 hover:bg-gray-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex gap-2 items-end">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tulis pertanyaan..."
                  maxLength={500}
                  disabled={loading}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className={`${accent.send} text-white rounded-lg p-2 disabled:opacity-40 disabled:cursor-not-allowed`}
                  aria-label="Kirim"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Pandai hanya menjawab seputar dashboard ini
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Format **bold** markdown
function formatMessage(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
