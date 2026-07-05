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
  Award
} from 'lucide-react';

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
    return !s || p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || p.pembina_id.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Kelola Pembina Magang
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {pembinaList.length} pembina terdaftar • {pembinaList.filter((p) => p.is_active).length} aktif
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
        >
          <Plus className="w-4 h-4" /> Tambah Pembina
        </button>
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

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada pembina terdaftar.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <div key={p.id} className={`bg-white rounded-xl border p-4 ${p.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full bg-bpjs-blue/10 flex items-center justify-center flex-shrink-0">
                    <UserCog className="w-6 h-6 text-bpjs-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full font-mono font-bold">{p.pembina_id}</span>
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{p.department}</span>
                      {!p.is_active && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Nonaktif</span>}
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
                    <button onClick={() => handleResetPwd(p.id)} title="Reset Password" className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md"><RefreshCw className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleToggleActive(p)} className={`p-1.5 rounded-md ${p.is_active ? 'bg-orange-100 hover:bg-orange-200 text-orange-700' : 'bg-green-100 hover:bg-green-200 text-green-700'}`}>
                      {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );

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
