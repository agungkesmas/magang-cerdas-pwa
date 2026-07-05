'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
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
  Mail,
  Phone,
  School as SchoolIcon,
  Edit,
  AlertCircle,
  Printer
} from 'lucide-react';
import PrintCredentialsModal, { PrintableCredential } from '@/components/admin/PrintCredentialsModal';

interface School {
  id: string;
  name: string;
  address?: string | null;
}

interface BKKTeacher {
  id: string;
  bkk_id?: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  raw_password: string;
  last_login_at: string | null;
  created_at: string;
  schools: School[];
}

export default function AdminBKKTeachersPage() {
  const [teachers, setTeachers] = useState<BKKTeacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<BKKTeacher | null>(null);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [printItems, setPrintItems] = useState<PrintableCredential[] | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch('/api/bkk-teachers/list'),
        fetch('/api/schools')
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      if (tData.success) setTeachers(tData.teachers);
      if (sData.success) setSchools(sData.schools);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShareCreds = (t: BKKTeacher) => {
    const shareText = `Hai ${t.name}!

Kredensial login Dashboard BKK MAGANG-CERDAS Anda:
Email: ${t.email}
Password: ${t.raw_password}

Sekolah yang Anda bimbing: ${t.schools.map((s) => s.name).join(', ')}

Login di: ${window.location.origin}/bkk/login

Selamat membimbing siswa magang di BPJS Ketenagakerjaan Cabang Cirebon!`;
    navigator.clipboard.writeText(shareText);
    setCopied(`share-${t.id}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePrintCreds = (t: BKKTeacher) => {
    setPrintItems([
      {
        name: t.name,
        idLabel: 'ID BKK',
        idValue: t.bkk_id || '-',
        password: t.raw_password,
        loginUrl: '/bkk/login',
        subInfo: [
          { label: 'Email', value: t.email },
          ...(t.schools?.length > 0 ? [{ label: 'Sekolah', value: t.schools.map((s) => s.name).join(', ') }] : []),
        ],
      },
    ]);
  };

  const handleResetPwd = async (id: string) => {
    if (!confirm('Yakin reset password? Password lama tidak bisa dikembalikan.')) return;
    const res = await fetch('/api/bkk-teachers/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Password baru: ${data.raw_password}`);
      fetchAll();
    } else {
      alert('Error: ' + data.error);
    }
  };

  const handleToggleActive = async (t: BKKTeacher) => {
    await fetch('/api/bkk-teachers/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, is_active: !t.is_active })
    });
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus guru BKK ini? Tindakan tidak bisa dibatalkan.')) return;
    await fetch(`/api/bkk-teachers/update?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.schools.some((s) => s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Guru BKK
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {teachers.length} guru BKK • {teachers.filter((t) => t.is_active).length} aktif
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTeacher(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
        >
          <Plus className="w-4 h-4" />
          Tambah Guru BKK
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, email, atau sekolah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
        />
      </div>

      {/* Empty state if no schools yet */}
      {schools.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Belum ada sekolah terdaftar</p>
            <p className="text-sm text-amber-700 mt-1">
              Tambahkan sekolah dulu di menu <strong>Sekolah</strong> sebelum membuat akun BKK.
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada guru BKK. Klik "Tambah Guru BKK" untuk memulai.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md ${
                t.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Identity */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-bpjs-green" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      {!t.is_active && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {t.email}
                      </span>
                      {t.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {t.phone}
                        </span>
                      )}
                      {t.last_login_at && (
                        <span>Last login: {new Date(t.last_login_at).toLocaleDateString('id-ID')}</span>
                      )}
                    </div>
                    {/* Schools */}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <SchoolIcon className="w-3 h-3 text-gray-400" />
                      {t.schools.length === 0 ? (
                        <span className="text-xs text-red-500">Belum di-link ke sekolah</span>
                      ) : (
                        t.schools.map((s) => (
                          <span
                            key={s.id}
                            className="text-xs px-2 py-0.5 bg-bpjs-green/10 text-bpjs-green rounded-full font-medium"
                          >
                            {s.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Credentials + actions */}
                <div className="flex flex-col gap-2 min-w-0 lg:w-72">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Kredensial Login</div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-mono text-gray-700 truncate">{t.email}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="text-gray-700">
                        {showPasswords[t.id] ? t.raw_password : '••••••••'}
                      </span>
                      <button
                        onClick={() => setShowPasswords((p) => ({ ...p, [t.id]: !p[t.id] }))}
                        className="text-gray-400 hover:text-bpjs-green"
                      >
                        {showPasswords[t.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleCopy(t.raw_password, `pwd-${t.id}`)}
                        className="text-gray-400 hover:text-bpjs-green"
                      >
                        {copied === `pwd-${t.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleShareCreds(t)}
                      className="flex-1 inline-flex items-center justify-center gap-1 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-xs font-semibold px-2 py-1.5 rounded-md"
                    >
                      {copied === `share-${t.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy Semua
                    </button>
                    <button
                      onClick={() => handlePrintCreds(t)}
                      title="Print Kartu Kredensial"
                      className="inline-flex items-center gap-1 bg-bpjs-green/20 hover:bg-bpjs-green/30 text-bpjs-green-dark text-xs font-semibold px-2.5 py-1.5 rounded-md"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    <button
                      onClick={() => {
                        setEditingTeacher(t);
                        setShowForm(true);
                      }}
                      title="Edit"
                      className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleResetPwd(t.id)}
                      title="Reset password"
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(t)}
                      title={t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className={`p-1.5 rounded-md ${
                        t.is_active
                          ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      }`}
                    >
                      {t.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
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

      {/* Add/Edit Modal */}
      {showForm && (
        <BKKFormModal
          schools={schools}
          editing={editingTeacher}
          onClose={() => {
            setShowForm(false);
            setEditingTeacher(null);
          }}
          onSuccess={(creds) => {
            if (creds && !editingTeacher) {
              setCreatedCreds(creds);
            }
            setShowForm(false);
            setEditingTeacher(null);
            fetchAll();
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
              <h3 className="text-xl font-bold text-gray-900">Guru BKK Berhasil Dibuat!</h3>
              <p className="text-gray-500 text-sm mt-1">Kredensial siap dibagikan ke {createdCreds.name}.</p>
            </div>

            <div className="bg-gradient-to-br from-bpjs-green to-bpjs-green-dark rounded-xl p-4 text-white space-y-2">
              <div>
                <div className="text-xs text-white/70">Nama</div>
                <div className="font-semibold">{createdCreds.name}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Email</div>
                <div className="font-mono font-bold text-bpjs-yellow text-sm break-all">{createdCreds.email}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Password</div>
                <div className="font-mono font-bold text-bpjs-yellow text-lg">{createdCreds.password}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Sekolah</div>
                <div className="text-sm">{createdCreds.schools.map((s: School) => s.name).join(', ')}</div>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(createdCreds.shareText);
                setCopied('created-share');
                setTimeout(() => {
                  setCreatedCreds(null);
                  setCopied(null);
                }, 1500);
              }}
              className="w-full mt-4 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
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

      {printItems && (
        <PrintCredentialsModal items={printItems} role="bkk" onClose={() => setPrintItems(null)} />
      )}
    </div>
  );
}

function BKKFormModal({
  schools,
  editing,
  onClose,
  onSuccess
}: {
  schools: School[];
  editing: BKKTeacher | null;
  onClose: () => void;
  onSuccess: (creds: any | null) => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    email: editing?.email || '',
    phone: editing?.phone || '',
    school_ids: editing?.schools.map((s) => s.id) || [],
    custom_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSchool = (id: string) => {
    setForm((f) => ({
      ...f,
      school_ids: f.school_ids.includes(id)
        ? f.school_ids.filter((s) => s !== id)
        : [...f.school_ids, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editing) {
        // Update existing
        const res = await fetch('/api/bkk-teachers/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editing.id,
            name: form.name,
            email: form.email,
            phone: form.phone,
            school_ids: form.school_ids
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onSuccess(null);
      } else {
        // Create new
        const res = await fetch('/api/bkk-teachers/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            school_ids: form.school_ids,
            custom_password: form.custom_password || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onSuccess(data);
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
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-900">
            {editing ? 'Edit Guru BKK' : 'Tambah Guru BKK Baru'}
          </h3>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="Drs. Bambang Sutrisno"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="bambang@smkn1cirebon.sch.id"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="0812-3456-7890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sekolah yang Dibimbing * (pilih 1 atau lebih)
            </label>
            {schools.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Belum ada sekolah terdaftar. Tambahkan sekolah dulu di menu Sekolah.
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {schools.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-green-50/30 ${
                      form.school_ids.includes(s.id) ? 'bg-bpjs-green/10' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.school_ids.includes(s.id)}
                      onChange={() => toggleSchool(s.id)}
                      className="w-4 h-4 accent-bpjs-green"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      {s.address && <div className="text-xs text-gray-500">{s.address}</div>}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {form.school_ids.length} sekolah dipilih
            </p>
          </div>

          {!editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password (opsional)
              </label>
              <input
                value={form.custom_password}
                onChange={(e) => setForm({ ...form, custom_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
                placeholder="Kosongkan untuk auto-generate"
              />
              <p className="text-xs text-gray-500 mt-1">
                Jika dikosongkan, sistem akan generate password otomatis.
              </p>
            </div>
          )}

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
              className="flex-1 px-4 py-2.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Simpan Perubahan' : 'Buat Guru BKK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
