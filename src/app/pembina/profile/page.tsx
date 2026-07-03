'use client';

import { useState, useEffect } from 'react';
import {
  UserCog,
  Mail,
  Phone,
  Building2,
  Loader2,
  Check,
  Save
} from 'lucide-react';

export default function PembinaProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch profile via API — kita pakai API pembina/list dan filter by current pembina
    // Atau lebih simpel: pakai token yang sudah ada di cookie
    fetchPembinaProfile();
  }, []);

  const fetchPembinaProfile = async () => {
    try {
      // Ambil dari token — kita buat endpoint simpel via pembina/list
      const res = await fetch('/api/pembina/list');
      const data = await res.json();
      if (data.success) {
        // Filter: cari pembina yang email-nya match dengan token (tapi kita tidak punya email di client)
        // Solusi: pakai API baru atau ambil dari response login yang disimpan
        // Untuk simpel: ambil semua, filter by is_active, ambil yang pertama
        // Tapi ini tidak akurat. Kita buat endpoint /api/pembina/profile
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  // Karena tidak ada API /api/pembina/profile, kita buat inline
  // Tapi untuk MVP, kita pakai approach: client side fetch dari /api/pembina/list
  // lalu cari yang match. Karena kita tidak punya ID di client side,
  // kita buat endpoint simpel.

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Profil Pembina
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Kelola data pribadi Anda
        </p>
      </div>

      <ProfileForm />
    </div>
  );
}

function ProfileForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pembinaId, setPembinaId] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/pembina/me');
      const data = await res.json();
      if (data.success) {
        setForm({
          name: data.pembina.name || '',
          email: data.pembina.email || '',
          phone: data.pembina.phone || '',
          department: data.pembina.department || ''
        });
        setPembinaId(data.pembina.id);
      }
    } catch (e) {
      setError('Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/pembina/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pembinaId,
          name: form.name,
          phone: form.phone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>;
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
          <UserCog className="w-8 h-8 text-purple-700" />
        </div>
        <div>
          <p className="font-bold text-gray-900">{form.name || 'Pembina'}</p>
          <p className="text-xs text-gray-500">{form.department}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
        <div className="relative">
          <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            placeholder="Nama lengkap"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email (tidak bisa diubah)</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            value={form.email}
            disabled
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-gray-500 bg-gray-50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Departemen (tidak bisa diubah)</label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={form.department}
            disabled
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-gray-500 bg-gray-50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            placeholder="08xxxxxxxxxx"
          />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> Profil berhasil diperbarui!
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Perubahan
        </button>
      </div>
    </form>
  );
}
