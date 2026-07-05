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
  UserCog,
  Mail,
  Building2,
  Award,
  Printer,
  Archive,
  RotateCcw
} from 'lucide-react';
import PrintCredentialsModal, { PrintableCredential } from '@/components/admin/PrintCredentialsModal';
import BatchUploadModal from '@/components/admin/BatchUploadModal';
import { Upload } from 'lucide-react';

interface Pembina {
  id: string;
  pembina_id: string;
  email: string;
  name: string;
  phone: string | null;
  department: string;
  raw_password: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function AdminPembinaPage() {
  const [pembinaList, setPembinaList] = useState<Pembina[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [printItems, setPrintItems] = useState<PrintableCredential[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatch, setShowBatch] = useState(false);
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const fetchPembina = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pembina/list');
      const data = await res.json();
      if (data.success) setPembinaList(data.pembina);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPembina(); }, [fetchPembina]);

  const filtered = pembinaList.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || p.pembina_id.toLowerCase().includes(s);
    const matchTab = tab === 'active' ? p.is_active : !p.is_active;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Kelola Pembina Magang
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {pembinaList.filter(p => p.is_active).length} aktif • {pembinaList.filter(p => !p.is_active).length} arsip • {pembinaList.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBatch(true)}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
          >
            <Upload className="w-4 h-4" /> Batch Upload
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
          >
            <Plus className="w-4 h-4" /> Tambah Pembina
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, email, atau ID pembina..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
        />
      </div>

      {/* Tab Aktif / Arsip */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab('active'); setSelectedIds(new Set()); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'active' ? 'bg-bpjs-blue text-white shadow-sm' : 'text-gray-600 bg-white border border-gray-200'}`}
        >
          Aktif ({pembinaList.filter(p => p.is_active).length})
        </button>
        <button
          onClick={() => { setTab('archived'); setSelectedIds(new Set()); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'archived' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-600 bg-white border border-gray-200'}`}
        >
          Arsip ({pembinaList.filter(p => !p.is_active).length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada pembina terdaftar.</p>
        </div>
      ) : (
        <>
          {/* Bulk action bar */}
          {(() => {
            const selectedCount = filtered.filter((p) => selectedIds.has(p.id)).length;
            const allSelected = filtered.length > 0 && selectedCount === filtered.length;
            return (
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(filtered.map((p) => p.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-bpjs-blue focus:ring-bpjs-blue"
                  />
                  <span className="font-medium text-gray-700">
                    {allSelected ? 'Batalkan pilih semua' : 'Pilih semua'} ({filtered.length})
                  </span>
                </label>
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">{selectedCount} dipilih</span>
                    <button
                      onClick={() => {
                        const items = pembinaList
                          .filter((p) => selectedIds.has(p.id))
                          .map((p) => ({
                            name: p.name,
                            idLabel: 'ID Pembina',
                            idValue: p.pembina_id,
                            password: p.raw_password,
                            loginUrl: '/pembina/login',
                            subInfo: [{ label: 'Departemen', value: p.department }],
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
                          if (!confirm(`Arsipkan ${selectedCount} pembina terpilih? Data tetap utuh, bisa di-restore kapan saja.`)) return;
                          for (const id of selectedIds) {
                            await fetch('/api/pembina/update', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id, is_active: false }),
                            });
                          }
                          setSelectedIds(new Set());
                          fetchPembina();
                        }}
                        className="inline-flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                      >
                        <Archive className="w-3.5 h-3.5" /> Arsipkan Terpilih ({selectedCount})
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!confirm(`Restore ${selectedCount} pembina terpilih? Mereka akan aktif kembali.`)) return;
                          for (const id of selectedIds) {
                            await fetch('/api/pembina/update', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id, is_active: true }),
                            });
                          }
                          setSelectedIds(new Set());
                          fetchPembina();
                        }}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Terpilih ({selectedCount})
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!confirm(`Yakin HAPUS PERMANEN ${selectedCount} pembina terpilih? Data akan hilang selamanya.`)) return;
                        for (const id of selectedIds) {
                          await fetch(`/api/pembina/delete?id=${id}`, { method: 'DELETE' });
                        }
                        setSelectedIds(new Set());
                        fetchPembina();
                      }}
                      className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Permanen ({selectedCount})
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">
                      Batal
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid gap-3">
          {filtered.map((p) => (
            <div key={p.id} className={`bg-white rounded-xl border p-4 ${p.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'} ${selectedIds.has(p.id) ? 'ring-2 ring-bpjs-blue/40' : ''}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        return next;
                      });
                    }}
                    className="w-4 h-4 mt-3 rounded border-gray-300 text-bpjs-blue focus:ring-bpjs-blue flex-shrink-0"
                  />
                  <div className="w-12 h-12 rounded-full bg-bpjs-blue/10 flex items-center justify-center flex-shrink-0">
                    <UserCog className="w-6 h-6 text-bpjs-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full font-mono font-bold">{p.pembina_id}</span>
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{p.department}</span>
                      {!p.is_active && <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full font-medium">Arsip</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>
                      {p.last_login_at && (
                        <span>Login terakhir: {new Date(p.last_login_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-0 lg:w-72">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Kredensial Login</div>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="font-semibold text-gray-900 truncate">{p.pembina_id}</span>
                      <button onClick={() => handleCopy(p.pembina_id, `id-${p.id}`)} className="text-gray-400 hover:text-bpjs-blue flex-shrink-0">
                        {copied === `id-${p.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="text-gray-700 truncate flex-1">{showPasswords[p.id] ? p.raw_password : '••••••••'}</span>
                      <button onClick={() => setShowPasswords((s) => ({ ...s, [p.id]: !s[p.id] }))} className="text-gray-400 hover:text-bpjs-blue flex-shrink-0">
                        {showPasswords[p.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button onClick={() => handleCopy(p.raw_password, `pwd-${p.id}`)} className="text-gray-400 hover:text-bpjs-blue flex-shrink-0">
                        {copied === `pwd-${p.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleCopyShare(p)} className="flex-1 inline-flex items-center justify-center gap-1 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white text-xs font-semibold px-2 py-1.5 rounded-md">
                      {copied === `share-${p.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
                    </button>
                    <button onClick={() => handlePrintCreds(p)} title="Print Kartu Kredensial" className="inline-flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold px-2.5 py-1.5 rounded-md"><Printer className="w-3.5 h-3.5" /> Print</button>
                    <button onClick={() => handleResetPwd(p.id)} title="Reset Password" className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md"><RefreshCw className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => handleToggleActive(p)}
                      title={p.is_active ? 'Arsipkan pembina' : 'Restore pembina'}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md ${p.is_active ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-green-100 hover:bg-green-200 text-green-700'}`}
                    >
                      {p.is_active ? <><Archive className="w-3.5 h-3.5" /> Arsipkan</> : <><RotateCcw className="w-3.5 h-3.5" /> Restore</>}
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {showForm && (
        <AddPembinaModal
          onClose={() => setShowForm(false)}
          onSuccess={(creds) => { if (creds) setCreatedCreds(creds); setShowForm(false); fetchPembina(); }}
        />
      )}

      {createdCreds && (
        <CreatedCredsModal creds={createdCreds} onClose={() => setCreatedCreds(null)} copied={copied} setCopied={setCopied} />
      )}

      {printItems && (
        <PrintCredentialsModal items={printItems} role="pembina" onClose={() => setPrintItems(null)} />
      )}

      {showBatch && (
        <BatchUploadModal
          role="pembina"
          onClose={() => setShowBatch(false)}
          onSuccess={() => fetchPembina()}
        />
      )}
    </div>
  );

  function handlePrintCreds(p: Pembina) {
    setPrintItems([
      {
        name: p.name,
        idLabel: 'ID Pembina',
        idValue: p.pembina_id,
        password: p.raw_password,
        loginUrl: '/pembina/login',
        subInfo: [{ label: 'Departemen', value: p.department }],
      },
    ]);
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleCopyShare(p: Pembina) {
    navigator.clipboard.writeText(`Hai ${p.name}!\n\nKredensial login Dashboard Pembina Magang Anda:\nID Pembina: ${p.pembina_id}\nEmail: ${p.email}\nPassword: ${p.raw_password}\n\nLogin di: ${window.location.origin}/pembina/login`);
    setCopied(`share-${p.id}`);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleResetPwd(id: string) {
    if (!confirm('Yakin reset password pembina ini?')) return;
    const res = await fetch('/api/pembina/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { alert(`Password baru: ${data.raw_password}`); fetchPembina(); }
    else alert(`Error: ${data.error}`);
  }

  async function handleToggleActive(p: Pembina) {
    const res = await fetch('/api/pembina/update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, is_active: !p.is_active }) });
    const data = await res.json();
    if (data.success) fetchPembina();
  }

  async function handleDelete(p: Pembina) {
    if (!confirm(`Yakin hapus pembina "${p.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const res = await fetch(`/api/pembina/delete?id=${p.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchPembina();
    else alert(`Error: ${data.error}`);
  }
}

function AddPembinaModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (creds: any) => void }) {
  const [form, setForm] = useState({ name: '', email: '', department: 'Pelayanan', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pembina/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess({ ...data.pembina, linked_groups: data.linked_groups || [] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-bpjs-blue" /> Tambah Pembina Baru
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Siti Rahayu" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="siti@magang-cerdas.local" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departemen *</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
              <option value="Pelayanan">Pelayanan</option>
              <option value="Pemasaran">Pemasaran</option>
              <option value="Keuangan">Keuangan</option>
              <option value="Lintas Bidang">Lintas Bidang</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon (opsional)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              placeholder="08xxxxxxxxxx" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tambah Pembina
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatedCredsModal({ creds, onClose, copied, setCopied }: { creds: any; onClose: () => void; copied: string | null; setCopied: (s: string | null) => void }) {
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyShare = () => {
    const text = `Halo ${creds.name}!\n\nKredensial login Dashboard Pembina Magang Anda:\nID Pembina: ${creds.pembina_id}\nEmail: ${creds.email}\nPassword: ${creds.raw_password}\n\nLogin di: ${typeof window !== 'undefined' ? window.location.origin : ''}/pembina/login`;
    navigator.clipboard.writeText(text);
    setCopied('share');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
            <Check className="w-5 h-5" /> Pembina Berhasil Dibuat!
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div>
              <div className="text-xs text-gray-500">Nama</div>
              <div className="font-semibold text-gray-900">{creds.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">ID Pembina</div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-bpjs-blue">{creds.pembina_id}</span>
                <button onClick={() => handleCopy(creds.pembina_id, 'id')} className="text-gray-400 hover:text-bpjs-blue">
                  {copied === 'id' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Email</div>
              <div className="text-gray-900">{creds.email}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Password (sementara)</div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-bpjs-blue">{creds.raw_password}</span>
                <button onClick={() => handleCopy(creds.raw_password, 'pwd')} className="text-gray-400 hover:text-bpjs-blue">
                  {copied === 'pwd' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
          <button onClick={handleCopyShare} className="w-full bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
            {copied === 'share' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy Semua Kredensial
          </button>
          <p className="text-xs text-gray-500 text-center">Login di: {typeof window !== 'undefined' ? window.location.origin : ''}/pembina/login</p>

          {/* Info grup yang auto-link */}
          {creds.linked_groups && creds.linked_groups.length > 0 && (
            <div className="bg-bpjs-green/10 border border-bpjs-green/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-bpjs-green-dark mb-1">✓ Auto-link ke Grup Departemen:</p>
              <ul className="text-xs text-gray-700 space-y-0.5">
                {creds.linked_groups.map((g: string, i: number) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-bpjs-green">●</span> {g}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-gray-500 mt-1.5">
                Pembina ini otomatis menjadi anggota grup di atas (sebagai member).
                Dia bisa langsung login & deploy quest ke grup.
              </p>
            </div>
          )}
          {creds.linked_groups && creds.linked_groups.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                ⚠️ Pembina ini <strong>belum terlink ke grup manapun</strong>.
                Tambahkan manual via menu Grup Chat → Detail Grup → Tambah Pembina.
              </p>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Tutup</button>
        </div>
      </div>
    </div>
  );
}
