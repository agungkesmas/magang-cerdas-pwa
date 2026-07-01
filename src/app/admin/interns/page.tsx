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
  Flame
} from 'lucide-react';

interface Intern {
  id: string;
  name: string;
  school_origin: string | null;
  major: string;
  department: string;
  start_date: string;
  end_date: string;
  total_exp: number;
  streak_count: number;
  username: string;
  raw_password: string;
  is_active: boolean;
  certificate_unlocked: boolean;
  created_at: string;
  time_progress: number;
  days_remaining: number;
}

interface CreatedIntern {
  name: string;
  username: string;
  raw_password: string;
  major: string;
  department: string;
}

export default function AdminInternsPage() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<CreatedIntern | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

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

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShareCreds = (intern: Intern) => {
    const shareText = `Hai ${intern.name}!

Kredensial login MAGANG-CERDAS Anda:
Username: ${intern.username}
Password: ${intern.raw_password}

Login di: ${window.location.origin}/intern/login

Selamat magang di BPJS Ketenagakerjaan Cabang Cirebon!`;
    navigator.clipboard.writeText(shareText);
    setCopied(`share-${intern.id}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenPwd = async (id: string) => {
    if (!confirm('Yakin regenerate password? Password lama tidak bisa dikembalikan.')) return;
    const res = await fetch('/api/interns/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'regenerate_password' })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Password baru: ${data.raw_password}`);
      fetchInterns();
    }
  };

  const handleToggleActive = async (id: string) => {
    await fetch('/api/interns/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'toggle_active' })
    });
    fetchInterns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus magang ini? Tindakan tidak bisa dibatalkan.')) return;
    await fetch(`/api/interns/update?id=${id}`, { method: 'DELETE' });
    fetchInterns();
  };

  const filtered = interns.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.major.toLowerCase().includes(search.toLowerCase()) ||
      i.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Manajemen Magang
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {interns.length} magang terdaftar • {interns.filter((i) => i.is_active).length} aktif
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Magang
        </button>
      </div>

      {/* Search */}
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada magang. Klik "Tambah Magang" untuk memulai.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((intern) => (
            <div
              key={intern.id}
              className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md ${
                intern.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Identity */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full bg-bpjs-blue/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-bpjs-blue font-bold text-lg">{intern.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{intern.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full font-medium">
                        {intern.department}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {intern.major}
                      </span>
                      {intern.certificate_unlocked && (
                        <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-blue-dark rounded-full font-medium flex items-center gap-1">
                          <Award className="w-3 h-3" /> Sertifikat
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {intern.days_remaining} hari tersisa
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {intern.total_exp} EXP
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {intern.streak_count} streak
                      </span>
                      {intern.school_origin && <span>• {intern.school_origin}</span>}
                    </div>

                    {/* Time progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                        <div
                          className="h-full bg-gradient-to-r from-bpjs-blue to-bpjs-blue-light"
                          style={{ width: `${intern.time_progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{intern.time_progress}%</span>
                    </div>
                  </div>
                </div>

                {/* Credentials */}
                <div className="flex flex-col gap-2 min-w-0 lg:w-72">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Kredensial Login</div>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="font-semibold text-gray-900">{intern.username}</span>
                      <button
                        onClick={() => handleCopy(intern.username, `user-${intern.id}`)}
                        className="text-gray-400 hover:text-bpjs-blue"
                      >
                        {copied === `user-${intern.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="text-gray-700">
                        {showPasswords[intern.id] ? intern.raw_password : '••••••••'}
                      </span>
                      <button
                        onClick={() => setShowPasswords((p) => ({ ...p, [intern.id]: !p[intern.id] }))}
                        className="text-gray-400 hover:text-bpjs-blue"
                      >
                        {showPasswords[intern.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleCopy(intern.raw_password, `pwd-${intern.id}`)}
                        className="text-gray-400 hover:text-bpjs-blue"
                      >
                        {copied === `pwd-${intern.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleShareCreds(intern)}
                      className="flex-1 inline-flex items-center justify-center gap-1 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark text-sm font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                      {copied === `share-${intern.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Semua
                    </button>
                    <button
                      onClick={() => handleRegenPwd(intern.id)}
                      title="Regenerate password"
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(intern.id)}
                      title={intern.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className={`p-1.5 rounded-md ${
                        intern.is_active
                          ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      }`}
                    >
                      {intern.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(intern.id)}
                      title="Hapus"
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Intern Modal */}
      {showForm && (
        <AddInternModal
          onClose={() => setShowForm(false)}
          onSuccess={(creds) => {
            setCreatedCreds(creds);
            setShowForm(false);
            fetchInterns();
          }}
        />
      )}

      {/* Created Credentials Modal */}
      {createdCreds && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Magang Berhasil Dibuat!</h3>
              <p className="text-gray-500 text-sm mt-1">Kredensial untuk {createdCreds.name} siap dibagikan.</p>
            </div>

            <div className="bg-gradient-to-br from-bpjs-blue to-bpjs-blue-dark rounded-xl p-4 text-white space-y-2">
              <div>
                <div className="text-xs text-white/70">Nama</div>
                <div className="font-semibold">{createdCreds.name}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Username</div>
                <div className="font-mono font-bold text-bpjs-yellow text-lg">{createdCreds.username}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Password</div>
                <div className="font-mono font-bold text-bpjs-yellow text-lg">{createdCreds.raw_password}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Login URL</div>
                <div className="font-mono text-xs text-white/90 break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/intern/login` : '/intern/login'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const shareText = `Hai ${createdCreds.name}!\n\nKredensial login MAGANG-CERDAS Anda:\nUsername: ${createdCreds.username}\nPassword: ${createdCreds.raw_password}\n\nLogin di: ${window.location.origin}/intern/login\n\nSelamat magang di BPJS Ketenagakerjaan Cabang Cirebon!`;
                navigator.clipboard.writeText(shareText);
                setCopied('created-share');
                setTimeout(() => {
                  setCreatedCreds(null);
                  setCopied(null);
                }, 1500);
              }}
              className="w-full mt-4 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {copied === 'created-share' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied === 'created-share' ? 'Tersalin!' : 'Copy & Tutup'}
            </button>

            <button
              onClick={() => setCreatedCreds(null)}
              className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm py-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddInternModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: (creds: CreatedIntern) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    school_origin: '',
    major: '',
    department: 'Pelayanan',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const COMMON_MAJORS = [
    'SMK RPL',
    'SMK TKJ',
    'SMK AKL',
    'SMK OTKP',
    'SMK MPLB',
    'SMK BDP',
    'SMK DKV',
    'Computer Science',
    'Management',
    'Economics',
    'Public Relations',
    'Law',
    'Psychology'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/interns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat magang');
      onSuccess({
        name: data.intern.name,
        username: data.intern.username,
        raw_password: data.intern.raw_password,
        major: data.intern.major,
        department: data.intern.department
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-900">Tambah Magang Baru</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Budi Santoso"
            />
            <p className="text-xs text-gray-500 mt-1">
              Username & password akan otomatis di-generate berdasarkan nama
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asal Sekolah/Kampus</label>
            <input
              value={form.school_origin}
              onChange={(e) => setForm({ ...form, school_origin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="SMK Negeri 1 Cirebon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan *</label>
            <input
              required
              list="majors-list"
              value={form.major}
              onChange={(e) => setForm({ ...form, major: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Pilih atau ketik jurusan"
            />
            <datalist id="majors-list">
              {COMMON_MAJORS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departemen *</label>
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            >
              <option value="Pelayanan">Pelayanan</option>
              <option value="Pemasaran">Pemasaran</option>
              <option value="Keuangan">Keuangan</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mulai *</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selesai *</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Buat Magang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
