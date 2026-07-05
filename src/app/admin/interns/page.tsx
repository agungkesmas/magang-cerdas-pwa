'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  X,
  Clock,
  Award,
  Flame,
  Edit,
  Upload,
  Download,
  Printer,
  Archive,
  RotateCcw
} from 'lucide-react';
import PrintCredentialsModal, { PrintableCredential } from '@/components/admin/PrintCredentialsModal';

// Predefined tags with colors
const PREDEFINED_TAGS = [
  { label: 'Unggul', color: 'bg-green-100 text-green-700 border-green-300' },
  { label: 'Perlu Perhatian', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { label: 'Leadership', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { label: 'Fast Learner', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { label: 'Bermasalah', color: 'bg-red-100 text-red-700 border-red-300' },
];
const TAG_COLORS: Record<string, string> = Object.fromEntries(PREDEFINED_TAGS.map(t => [t.label, t.color]));

interface Intern {
  id: string;
  name: string;
  school_origin: string | null;
  major: string;
  major_id: string | null;
  department: string;
  start_date: string;
  end_date: string;
  total_exp: number;
  streak_count: number;
  username: string;
  raw_password: string;
  is_active: boolean;
  logbook_enabled?: boolean;
  certificate_unlocked: boolean;
  created_at: string;
  time_progress: number;
  days_remaining: number;
  email?: string | null;
  whatsapp?: string | null;
  tags?: string[];
}

interface CreatedIntern {
  name: string;
  username: string;
  raw_password: string;
  major: string;
  department: string;
}

interface BatchResult {
  index: number;
  name: string;
  username?: string;
  raw_password?: string;
  major?: string;
  department?: string;
  school_origin?: string;
  email?: string;
  whatsapp?: string;
  success?: boolean;
  error?: string;
}

export default function AdminInternsPage() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingIntern, setEditingIntern] = useState<Intern | null>(null);
  const [createdCreds, setCreatedCreds] = useState<CreatedIntern | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showBatch, setShowBatch] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printItems, setPrintItems] = useState<PrintableCredential[] | null>(null);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const fetchInterns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/interns/list');
      const data = await res.json();
      if (data.success) setInterns(data.interns);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterns();
  }, [fetchInterns]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Manajemen Peserta Magang
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {interns.filter((i) => i.is_active).length} aktif • {interns.filter((i) => !i.is_active).length} arsip • {interns.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBatch(true)}
            className="inline-flex items-center gap-2 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
          >
            <Upload className="w-4 h-4" /> Batch Upload
          </button>
          <button
            onClick={() => { setEditingIntern(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
          >
            <Plus className="w-4 h-4" /> Tambah Peserta
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, jurusan, atau username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
        />
      </div>

      {/* Tab Aktif / Arsip + Tag Filter */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => { setTab('active'); setSelectedIds(new Set()); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'active' ? 'bg-bpjs-blue text-white shadow-sm' : 'text-gray-600 bg-white border border-gray-200'}`}
        >
          Aktif ({interns.filter(i => i.is_active).length})
        </button>
        <button
          onClick={() => { setTab('archived'); setSelectedIds(new Set()); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'archived' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-600 bg-white border border-gray-200'}`}
        >
          Arsip ({interns.filter(i => !i.is_active).length})
        </button>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md text-sm border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
        >
          <option value="all">Semua Tag</option>
          {PREDEFINED_TAGS.map(t => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" /></div>
      ) : (
        <>
          {/* Bulk action bar — muncul kalau ada yang dipilih */}
          {(() => {
            const filteredList = interns.filter((i) => {
              const s = search.toLowerCase();
              const matchSearch = !s || i.name.toLowerCase().includes(s) || i.major.toLowerCase().includes(s) || i.username.toLowerCase().includes(s);
              const matchTab = tab === 'active' ? i.is_active : !i.is_active;
              const matchTag = tagFilter === 'all' || (i.tags || []).includes(tagFilter);
              return matchSearch && matchTab && matchTag;
            });
            const selectedCount = filteredList.filter((i) => selectedIds.has(i.id)).length;
            const allSelected = filteredList.length > 0 && selectedCount === filteredList.length;
            if (selectedCount === 0 && filteredList.length === 0) return null;
            return (
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredList.map((i) => i.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-bpjs-blue focus:ring-bpjs-blue"
                  />
                  <span className="font-medium text-gray-700">
                    {allSelected ? 'Batalkan pilih semua' : 'Pilih semua'} ({filteredList.length})
                  </span>
                </label>
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">{selectedCount} dipilih</span>
                    <button
                      onClick={() => {
                        const items = interns
                          .filter((i) => selectedIds.has(i.id))
                          .map((i) => ({
                            name: i.name,
                            idLabel: 'Username',
                            idValue: i.username,
                            password: i.raw_password,
                            loginUrl: '/intern/login',
                            subInfo: [
                              { label: 'Jurusan', value: i.major },
                              { label: 'Dept', value: i.department },
                            ],
                          }));
                        setPrintItems(items);
                      }}
                      className="inline-flex items-center gap-1 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Terpilih ({selectedCount})
                    </button>
                    {tab === 'active' ? (
                      <button
                        onClick={async () => {
                          if (!confirm(`Arsipkan ${selectedCount} peserta terpilih? Data tetap utuh, bisa di-restore kapan saja.`)) return;
                          for (const id of selectedIds) {
                            await fetch('/api/interns/update', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id, is_active: false }),
                            });
                          }
                          setSelectedIds(new Set());
                          fetchInterns();
                        }}
                        className="inline-flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                      >
                        <Archive className="w-3.5 h-3.5" /> Arsipkan Terpilih ({selectedCount})
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!confirm(`Restore ${selectedCount} peserta terpilih? Mereka akan aktif kembali.`)) return;
                          for (const id of selectedIds) {
                            await fetch('/api/interns/update', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id, is_active: true }),
                            });
                          }
                          setSelectedIds(new Set());
                          fetchInterns();
                        }}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Terpilih ({selectedCount})
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!confirm(`Yakin HAPUS PERMANEN ${selectedCount} peserta terpilih? Semua data (EXP, attendance, chat) akan hilang selamanya.`)) return;
                        for (const id of selectedIds) {
                          await fetch(`/api/interns/update?id=${id}`, { method: 'DELETE' });
                        }
                        setSelectedIds(new Set());
                        fetchInterns();
                      }}
                      className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Permanen ({selectedCount})
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid gap-3">
            {interns.filter((i) => {
              const s = search.toLowerCase();
              const matchSearch = !s || i.name.toLowerCase().includes(s) || i.major.toLowerCase().includes(s) || i.username.toLowerCase().includes(s);
              const matchTab = tab === 'active' ? i.is_active : !i.is_active;
              const matchTag = tagFilter === 'all' || (i.tags || []).includes(tagFilter);
              return matchSearch && matchTab && matchTag;
            }).map((intern) => (
            <div key={intern.id} className={`bg-white rounded-xl border p-4 ${intern.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50/50'} ${selectedIds.has(intern.id) ? 'ring-2 ring-bpjs-blue/40' : ''}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(intern.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(intern.id);
                        else next.delete(intern.id);
                        return next;
                      });
                    }}
                    className="w-4 h-4 mt-3 rounded border-gray-300 text-bpjs-blue focus:ring-bpjs-blue flex-shrink-0"
                  />
                  <div className="w-12 h-12 rounded-full bg-bpjs-blue/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-bpjs-blue font-bold text-lg">{intern.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{intern.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full">{intern.department}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{intern.major}</span>
                      {!intern.is_active && <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full font-medium">Arsip</span>}
                      {(intern.tags || []).map(tag => (
                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>{tag}</span>
                      ))}
                      {/* Tag dropdown */}
                      <div className="relative inline-block group">
                        <button className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full hover:bg-bpjs-blue/20 font-medium">+ Tag</button>
                        <div className="hidden group-hover:block absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[160px]">
                          {PREDEFINED_TAGS.map(t => (
                            <button
                              key={t.label}
                              onClick={() => handleToggleTag(intern.id, t.label, intern.tags || [])}
                              className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded text-xs hover:bg-gray-50 ${(intern.tags || []).includes(t.label) ? 'font-bold' : ''}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${t.color.split(' ')[0]}`}></span>
                              {t.label}
                              {(intern.tags || []).includes(t.label) && <span className="ml-auto text-green-600">✓</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className={`flex items-center gap-1 font-medium ${
                        intern.time_progress >= 80 ? 'text-red-600' :
                        intern.time_progress >= 50 ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {intern.days_remaining} hari tersisa
                      </span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" />{intern.total_exp} EXP</span>
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" />{intern.streak_count} streak</span>
                      {intern.email && <span>📧 {intern.email}</span>}
                      {intern.whatsapp && <span>💬 {intern.whatsapp}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                        <div
                          className={`h-full rounded-full transition-all ${
                            intern.time_progress >= 80 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                            intern.time_progress >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                            'bg-gradient-to-r from-green-400 to-green-600'
                          }`}
                          style={{ width: `${intern.time_progress}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${
                        intern.time_progress >= 80 ? 'text-red-600' :
                        intern.time_progress >= 50 ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {intern.time_progress}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-0 lg:w-72">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Kredensial Login</div>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="font-semibold text-gray-900">{intern.username}</span>
                      <button onClick={() => handleCopy(intern.username, `user-${intern.id}`)} className="text-gray-400 hover:text-bpjs-blue">
                        {copied === `user-${intern.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="text-gray-700 flex-1 truncate">{showPasswords[intern.id] ? intern.raw_password : '••••••••'}</span>
                      <button onClick={() => setShowPasswords((p) => ({ ...p, [intern.id]: !p[intern.id] }))} className="text-gray-400 hover:text-bpjs-blue flex-shrink-0" title="Show/Hide password">
                        {showPasswords[intern.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button onClick={() => handleCopy(intern.raw_password, `pwd-${intern.id}`)} className="text-gray-400 hover:text-bpjs-blue flex-shrink-0" title="Copy password">
                        {copied === `pwd-${intern.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleCopyShare(intern)} className="flex-1 inline-flex items-center justify-center gap-1 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white text-xs font-semibold px-2 py-1.5 rounded-md">
                      {copied === `share-${intern.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
                    </button>
                    <button
                      onClick={() => {
                        setPrintItems([{
                          name: intern.name,
                          idLabel: 'Username',
                          idValue: intern.username,
                          password: intern.raw_password,
                          loginUrl: '/intern/login',
                          subInfo: [
                            { label: 'Jurusan', value: intern.major },
                            { label: 'Dept', value: intern.department },
                          ],
                        }]);
                      }}
                      title="Print Kartu Kredensial"
                      className="inline-flex items-center gap-1 bg-bpjs-yellow/20 hover:bg-bpjs-yellow/30 text-bpjs-yellow-dark text-xs font-semibold px-2.5 py-1.5 rounded-md"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    <button onClick={() => { setEditingIntern(intern); setShowForm(true); }} className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleRegenPwd(intern.id)} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md"><RefreshCw className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => handleToggleActive(intern.id)}
                      title={intern.is_active ? 'Arsipkan peserta' : 'Restore peserta'}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md ${intern.is_active ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-green-100 hover:bg-green-200 text-green-700'}`}
                    >
                      {intern.is_active ? <><Archive className="w-3.5 h-3.5" /> Arsipkan</> : <><RotateCcw className="w-3.5 h-3.5" /> Restore</>}
                    </button>
                    <button onClick={() => handleDelete(intern.id)} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {showForm && (
        <AddInternModal
          editing={editingIntern}
          onClose={() => { setShowForm(false); setEditingIntern(null); }}
          onSuccess={(creds) => { if (creds && !editingIntern) setCreatedCreds(creds); setShowForm(false); setEditingIntern(null); fetchInterns(); }}
        />
      )}

      {showBatch && (
        <BatchUploadModal
          onClose={() => { setShowBatch(false); setBatchResults(null); }}
          onSuccess={(results) => { setBatchResults(results); fetchInterns(); }}
        />
      )}

      {printItems && (
        <PrintCredentialsModal items={printItems} role="peserta" onClose={() => setPrintItems(null)} />
      )}

      {createdCreds && (
        <CreatedCredsModal creds={createdCreds} onClose={() => setCreatedCreds(null)} copied={copied} setCopied={setCopied} />
      )}
    </div>
  );

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleCopyShare(intern: Intern) {
    navigator.clipboard.writeText(`Hai ${intern.name}!\n\nKredensial login MAGANG-CERDAS Anda:\nUsername: ${intern.username}\nPassword: ${intern.raw_password}\n\nLogin di: ${window.location.origin}/intern/login`);
    setCopied(`share-${intern.id}`);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleRegenPwd(id: string) {
    if (!confirm('Yakin regenerate password?')) return;
    const res = await fetch('/api/interns/update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'regenerate_password' }) });
    const data = await res.json();
    if (data.success) { alert(`Password baru: ${data.raw_password}`); fetchInterns(); }
  }

  async function handleToggleActive(id: string) {
    await fetch('/api/interns/update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle_active' }) });
    fetchInterns();
  }

  async function handleToggleTag(internId: string, tag: string, currentTags: string[] = []) {
    const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
    await fetch('/api/interns/update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: internId, tags: newTags }) });
    fetchInterns();
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus peserta ini?')) return;
    await fetch(`/api/interns/update?id=${id}`, { method: 'DELETE' });
    fetchInterns();
  }
}

// ============================================================
// BatchUploadModal
// ============================================================
function BatchUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (results: BatchResult[]) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [uploadMode, setUploadMode] = useState<'excel' | 'csv'>('excel');
  const [parseWarnings, setParseWarnings] = useState<{ row: number; message: string }[]>([]);

  // Download Excel template from API
  const downloadExcelTemplate = async () => {
    try {
      const res = await fetch('/api/interns/template');
      if (!res.ok) throw new Error('Gagal download template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-batch-peserta-magang-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Legacy: CSV template (kept as fallback)
  const downloadCsvTemplate = () => {
    const headers = ['Nama', 'Jurusan', 'Departemen', 'Institusi', 'TanggalMulai', 'TanggalSelesai', 'Email', 'WhatsApp'];
    const example = ['Budi Santoso', 'Rekayasa Perangkat Lunak', 'Pelayanan', 'SMK Negeri 1 Cirebon', '2026-07-01', '2026-12-31', 'budi@email.com', '081234567890'];
    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-batch-peserta-magang.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Excel upload: parse via API then batch-create
  const handleExcelUpload = async (file: File) => {
    setLoading(true);
    setError('');
    setResults(null);
    setParseWarnings([]);
    try {
      // Step 1: Parse Excel via API
      const formData = new FormData();
      formData.append('file', file);
      const parseRes = await fetch('/api/interns/parse-excel', {
        method: 'POST',
        body: formData
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error);
      if (parseData.errors?.length > 0) setParseWarnings(parseData.errors);
      if (!parseData.interns || parseData.interns.length === 0) {
        throw new Error('Tidak ada baris valid setelah parsing');
      }

      // Step 2: Batch create
      const res = await fetch('/api/interns/batch-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interns: parseData.interns })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
      onSuccess(data.results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Legacy CSV upload
  const handleCsvUpload = async (file: File) => {
    setLoading(true);
    setError('');
    setResults(null);
    setParseWarnings([]);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('Nama'));
      const interns: any[] = lines.map((line) => {
        const cols = line.match(/("[^"]*"|[^,]+)/g)?.map((c) => c.replace(/^"|"$/g, '').trim()) || [];
        return {
          name: cols[0] || '',
          major: cols[1] || 'Umum',
          department: cols[2] || 'Pelayanan',
          school_origin: cols[3] || '',
          start_date: cols[4] || new Date().toISOString().split('T')[0],
          end_date: cols[5] || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          email: cols[6] || '',
          whatsapp: cols[7] || ''
        };
      });

      const res = await fetch('/api/interns/batch-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interns })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
      onSuccess(data.results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (uploadMode === 'excel') {
      handleExcelUpload(file);
    } else {
      handleCsvUpload(file);
    }
  };

  const downloadResultsCSV = () => {
    if (!results) return;
    const headers = ['Nama', 'Username', 'Password', 'Jurusan', 'Departemen', 'Institusi', 'Email', 'WhatsApp', 'Status'];
    const rows = results.map((r) => [
      `"${r.name || ''}"`, `"${r.username || ''}"`, `"${r.raw_password || ''}"`,
      `"${r.major || ''}"`, `"${r.department || ''}"`, `"${r.school_origin || ''}"`,
      `"${r.email || ''}"`, `"${r.whatsapp || ''}"`,
      r.success ? 'Berhasil' : `Gagal: ${r.error || ''}`
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hasil-batch-peserta-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-bpjs-green" /> Batch Upload Peserta Magang
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {!results && !loading && (
            <>
              {/* Mode toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => setUploadMode('excel')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    uploadMode === 'excel' ? 'bg-bpjs-green text-white shadow-sm' : 'text-gray-600'
                  }`}
                >
                  📊 Excel (.xlsx)
                </button>
                <button
                  onClick={() => setUploadMode('csv')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    uploadMode === 'csv' ? 'bg-bpjs-green text-white shadow-sm' : 'text-gray-600'
                  }`}
                >
                  📄 CSV
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Cara Pakai:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Download template {uploadMode === 'excel' ? 'Excel (.xlsx)' : 'CSV'} di bawah</li>
                  <li>Buka di Excel/Google Sheets, isi data peserta (1 baris = 1 peserta)</li>
                  <li>Hapus baris contoh (Budi, Siti, Andi) sebelum upload</li>
                  <li>Upload file yang sudah diisi</li>
                  <li>Sistem auto-generate username + password untuk setiap peserta</li>
                  <li>Download hasil CSV atau print kartu kredensial</li>
                </ol>
              </div>

              {/* Download template button */}
              {uploadMode === 'excel' ? (
                <button
                  onClick={downloadExcelTemplate}
                  className="w-full flex items-center justify-center gap-2 bg-bpjs-green/10 hover:bg-bpjs-green/20 border border-bpjs-green/30 text-bpjs-green-dark font-semibold py-3 rounded-lg"
                >
                  <Download className="w-5 h-5" /> Download Template Excel (.xlsx)
                </button>
              ) : (
                <button
                  onClick={downloadCsvTemplate}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-medium py-3 rounded-lg"
                >
                  <Download className="w-5 h-5" /> Download Template CSV
                </button>
              )}

              {/* Upload area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Pilih file {uploadMode === 'excel' ? 'Excel (.xlsx, .xls)' : 'CSV'} yang sudah diisi
                </p>
                <label className="inline-flex items-center gap-2 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold px-4 py-2 rounded-lg cursor-pointer">
                  <Upload className="w-4 h-4" /> Pilih File
                  <input
                    type="file"
                    accept={uploadMode === 'excel' ? '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : '.csv,text/csv'}
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </label>
                <p className="text-[10px] text-gray-400 mt-2">Maksimal 100 peserta per upload</p>
              </div>

              {/* Parse warnings */}
              {parseWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-amber-900 mb-1">⚠️ {parseWarnings.length} baris dilewati:</p>
                  <ul className="text-xs text-amber-800 space-y-0.5 max-h-32 overflow-y-auto">
                    {parseWarnings.slice(0, 10).map((w, i) => (
                      <li key={i}>Baris {w.row}: {w.message}</li>
                    ))}
                    {parseWarnings.length > 10 && <li>...dan {parseWarnings.length - 10} lainnya</li>}
                  </ul>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-bpjs-green mb-3" />
              <p className="text-sm text-gray-600">Membuat akun peserta... Mohon tunggu.</p>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          {results && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                ✅ {results.filter((r) => r.success).length} peserta berhasil dibuat, {results.filter((r) => !r.success).length} gagal
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={downloadResultsCSV} className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg">
                  <Download className="w-4 h-4" /> Download Hasil CSV
                </button>
                <button onClick={() => setShowPrint(true)} className="inline-flex items-center gap-1 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white text-sm font-medium px-3 py-2 rounded-lg">
                  <Printer className="w-4 h-4" /> Print Kartu Kredensial
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Nama</th>
                      <th className="text-left px-3 py-2">Username</th>
                      <th className="text-left px-3 py-2">Password</th>
                      <th className="text-left px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.map((r) => (
                      <tr key={r.index} className={r.success ? '' : 'bg-red-50'}>
                        <td className="px-3 py-2">{r.index}</td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 font-mono">{r.username || '-'}</td>
                        <td className="px-3 py-2 font-mono">{r.raw_password || '-'}</td>
                        <td className="px-3 py-2">
                          {r.success ? <span className="text-green-600">✓ Berhasil</span> : <span className="text-red-600">✗ {r.error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {showPrint && results && (
          <BatchPrintCredentialsModal results={results.filter((r) => r.success)} onClose={() => setShowPrint(false)} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// BatchPrintCredentialsModal — Printable cards (untuk batch upload results)
// ============================================================
function BatchPrintCredentialsModal({ results, onClose }: { results: BatchResult[]; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  const copyAll = () => {
    const text = results.map((r) => `Hai ${r.name}!\nUsername: ${r.username}\nPassword: ${r.raw_password}\nLogin: ${window.location.origin}/intern/login`).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    alert('Semua kredensial tersalin!');
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .batch-print-modal, .batch-print-modal * { visibility: visible !important; }
          .batch-print-modal {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            display: block !important;
            padding: 8px !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .batch-print-modal .batch-modal-header { display: none !important; }
        }
      `}} />
    <div className="batch-print-modal fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="batch-modal-header flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white print:hidden">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Printer className="w-5 h-5" /> Kartu Kredensial ({results.length})</h3>
          <div className="flex gap-2">
            <button onClick={copyAll} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1"><Copy className="w-4 h-4" /> Copy Semua</button>
            <button onClick={handlePrint} className="text-sm bg-bpjs-blue text-white px-3 py-1.5 rounded-lg flex items-center gap-1"><Printer className="w-4 h-4" /> Print</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-5 print:p-0">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3">
            {results.map((r, idx) => (
              <div key={idx} className="border-2 border-bpjs-blue rounded-xl p-4 bg-white">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <div className="w-10 h-10 bg-bpjs-blue rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">BPJS</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-bpjs-blue">MAGANG-CERDAS</p>
                    <p className="text-[10px] text-gray-500">BPJS Ketenagakerjaan</p>
                  </div>
                </div>
                <p className="font-bold text-sm text-gray-900 mb-2">{r.name}</p>
                <div className="space-y-1 text-xs">
                  <div><span className="text-gray-500">Username:</span> <span className="font-mono font-bold text-bpjs-blue">{r.username}</span></div>
                  <div><span className="text-gray-500">Password:</span> <span className="font-mono font-bold text-bpjs-blue">{r.raw_password}</span></div>
                  <div><span className="text-gray-500">Login:</span> <span className="font-mono text-[10px]">magang-cerdas-pwa.vercel.app/intern/login</span></div>
                  {r.major && <div><span className="text-gray-500">Jurusan:</span> {r.major}</div>}
                  {r.department && <div><span className="text-gray-500">Dept:</span> {r.department}</div>}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                  Simpan kredensial ini dengan aman. Jangan bagikan ke orang lain.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ============================================================
// AddInternModal (reuse, tambah email + whatsapp)
// ============================================================
function AddInternModal({
  editing,
  onClose,
  onSuccess
}: {
  editing: Intern | null;
  onClose: () => void;
  onSuccess: (creds: CreatedIntern | null) => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    school_origin: editing?.school_origin || '',
    school_id: '',
    major: editing?.major || '',
    major_id: editing?.major_id || '',
    department: editing?.department || 'Pelayanan',
    start_date: editing?.start_date || new Date().toISOString().split('T')[0],
    end_date: editing?.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    email: editing?.email || '',
    whatsapp: editing?.whatsapp || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [majors, setMajors] = useState<{ id: string; name: string; code?: string | null }[]>([]);

  // Fetch schools + majors (simplified)
  useEffect(() => {
    fetch('/api/schools').then((r) => r.json()).then((d) => {
      if (d.success) {
        setSchools(d.schools || []);
        if (!editing && d.schools?.length > 0) {
          setForm((f) => ({ ...f, school_origin: d.schools[0].name, school_id: d.schools[0].id }));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!form.school_id) { setMajors([]); return; }
    fetch(`/api/majors?school_id=${form.school_id}`).then((r) => r.json()).then((d) => {
      if (d.success) setMajors(d.majors || []);
    });
  }, [form.school_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editing) {
        const res = await fetch('/api/interns/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editing.id,
            name: form.name,
            school_origin: form.school_origin,
            major: form.major,
            major_id: form.major_id || null,
            department: form.department,
            start_date: form.start_date,
            end_date: form.end_date,
            email: form.email || null,
            whatsapp: form.whatsapp || null
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onSuccess(null);
      } else {
        const res = await fetch('/api/interns/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, email: form.email || undefined, whatsapp: form.whatsapp || undefined })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onSuccess({
          name: data.intern.name,
          username: data.intern.username,
          raw_password: data.intern.raw_password,
          major: data.intern.major,
          department: data.intern.department
        });
      }
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
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Data Peserta' : 'Tambah Peserta Magang'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40" placeholder="Budi Santoso" />
            {!editing && <p className="text-xs text-gray-500 mt-1">Username & password akan otomatis di-generate</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asal Institusi *</label>
            {schools.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Belum ada institusi. <a href="/admin/schools" className="text-bpjs-blue hover:underline font-medium">Tambah di sini</a>
              </div>
            ) : (
              <select
                required
                value={form.school_origin}
                onChange={(e) => { const s = schools.find((s) => s.name === e.target.value); setForm({ ...form, school_origin: e.target.value, school_id: s?.id || '', major_id: '', major: '' }); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              >
                <option value="" disabled>-- Pilih Institusi --</option>
                {schools.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                {editing && form.school_origin && !schools.find((s) => s.name === form.school_origin) && (
                  <option value={form.school_origin}>⚠️ Lainnya: {form.school_origin}</option>
                )}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan *</label>
            {majors.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Belum ada jurusan. <a href="/admin/schools" className="text-bpjs-blue hover:underline font-medium">Tambah di sini</a>
              </div>
            ) : (
              <select
                required
                value={form.major_id}
                onChange={(e) => { const m = majors.find((m) => m.id === e.target.value); setForm({ ...form, major_id: e.target.value, major: m?.name || '' }); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              >
                <option value="" disabled>-- Pilih Jurusan --</option>
                {majors.map((m) => <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ''}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departemen *</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
              <option value="Pelayanan">Pelayanan</option>
              <option value="Pemasaran">Pemasaran</option>
              <option value="Keuangan">Keuangan</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mulai *</label>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selesai *</label>
              <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" placeholder="budi@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" placeholder="0812-3456-7890" />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? 'Simpan' : 'Buat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CreatedCredsModal (simplified)
// ============================================================
function CreatedCredsModal({ creds, onClose, copied, setCopied }: { creds: CreatedIntern; onClose: () => void; copied: string | null; setCopied: (v: string | null) => void }) {
  const shareText = `Hai ${creds.name}!\n\nKredensial login MAGANG-CERDAS Anda:\nUsername: ${creds.username}\nPassword: ${creds.raw_password}\n\nLogin di: ${typeof window !== 'undefined' ? window.location.origin : ''}/intern/login\n\nSelamat magang!`;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3"><Check className="w-8 h-8 text-green-600" /></div>
          <h3 className="text-xl font-bold text-gray-900">Peserta Berhasil Dibuat!</h3>
        </div>
        <div className="bg-gradient-to-br from-bpjs-blue to-bpjs-blue-dark rounded-xl p-4 text-white space-y-2">
          <div><div className="text-xs text-white/70">Nama</div><div className="font-semibold">{creds.name}</div></div>
          <div><div className="text-xs text-white/70">Username</div><div className="font-mono font-bold text-bpjs-yellow">{creds.username}</div></div>
          <div><div className="text-xs text-white/70">Password</div><div className="font-mono font-bold text-bpjs-yellow text-lg">{creds.raw_password}</div></div>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(shareText); setCopied('created-share'); setTimeout(() => { onClose(); setCopied(null); }, 1500); }}
          className="w-full mt-4 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
          {copied === 'created-share' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />} {copied === 'created-share' ? 'Tersalin!' : 'Copy & Tutup'}
        </button>
        <button onClick={onClose} className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm py-2">Tutup</button>
      </div>
    </div>
  );
}
