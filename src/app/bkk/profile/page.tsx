'use client';

import { useState, useEffect, useRef } from 'react';
import ShareButton from '@/components/shared/ShareButton';
import {
  UserCircle,
  Mail,
  Phone,
  School as SchoolIcon,
  Lock,
  Loader2,
  Save,
  Check,
  AlertCircle,
  Calendar,
  Camera
} from 'lucide-react';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  photo_url: string | null;
  created_at: string;
  schools: { id: string; name: string; address: string | null }[];
}

export default function BKKProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const [phoneEdit, setPhoneEdit] = useState('');
  const [waEdit, setWaEdit] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/bkk/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProfile(d.profile);
          setPhoneEdit(d.profile.phone || '');
          setWaEdit(d.profile.whatsapp || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Upload foto profil BKK
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadPhoto = async (file: File) => {
    if (file.size > 3 * 1024 * 1024) { setMsg({ type: 'error', text: 'Maksimal 3MB' }); return; }
    if (!file.type.startsWith('image/')) { setMsg({ type: 'error', text: 'File harus gambar' }); return; }
    setUploading(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch('/api/bkk/upload-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: 'success', text: 'Foto profil diperbarui!' });
      const profRes = await fetch('/api/bkk/profile');
      const profData = await profRes.json();
      if (profData.success) setProfile(profData.profile);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSavePhone = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/bkk/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneEdit, whatsapp: waEdit })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: 'success', text: 'Kontak tersimpan!' });
      // Refresh profile
      const profRes = await fetch('/api/bkk/profile');
      const profData = await profRes.json();
      if (profData.success) setProfile(profData.profile);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (form.new_password !== form.confirm_password) {
      setMsg({ type: 'error', text: 'Password baru dan konfirmasi tidak cocok' });
      return;
    }
    if (form.new_password.length < 8) {
      setMsg({ type: 'error', text: 'Password baru minimal 8 karakter' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/bkk/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: 'success', text: 'Password berhasil diganti!' });
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Profil Saya
        </h1>
        <p className="text-gray-500 text-sm mt-1">Kelola informasi akun dan keamanan</p>
      </div>

      {/* Profile info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="relative">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-10 h-10 text-bpjs-green" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-bpjs-green text-white rounded-full flex items-center justify-center shadow-md hover:bg-bpjs-green-dark disabled:opacity-50"
              title="Ganti foto profil"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadPhoto(file);
              }}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500">Guru BKK — Pembimbing Sekolah</p>
            {profile.last_login_at && (
              <p className="text-xs text-gray-400 mt-1">
                Login terakhir: {new Date(profile.last_login_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <div className="mt-2">
              <ShareButton
                data={{
                  name: profile.name,
                  major: 'Guru BKK',
                  department: 'Pembimbing Sekolah',
                  totalExp: 0,
                  level: 1,
                  tier: '',
                  timeProgress: 0,
                  daysRemaining: 0,
                  streak: 0,
                  type: 'profile'
                }}
                label="Bagikan Profil"
                variant="compact"
              />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email</label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-bpjs-green" />
              <span className="text-sm font-medium text-gray-900">{profile.email}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">No. Telepon</label>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="w-4 h-4 text-bpjs-green" />
              <span className="text-sm text-gray-900">{profile.phone || '-'}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Bergabung Sejak</label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-bpjs-green" />
              <span className="text-sm text-gray-900">
                {new Date(profile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Status</label>
            <div className="mt-1">
              {profile.is_active ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-bpjs-green/10 text-bpjs-green rounded-full font-medium">
                  <Check className="w-3 h-3" /> Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                  Nonaktif
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Schools */}
        <div className="mt-5">
          <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sekolah yang Dibimbing</label>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {profile.schools.length === 0 ? (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                Belum di-link ke sekolah manapun. Hubungi admin untuk setup.
              </div>
            ) : (
              profile.schools.map((s) => (
                <div
                  key={s.id}
                  className="bg-bpjs-green/10 border border-bpjs-green/20 rounded-lg p-3 max-w-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <SchoolIcon className="w-4 h-4 text-bpjs-green" />
                    <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                  </div>
                  {s.address && <p className="text-xs text-gray-500">{s.address}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Editable: Phone + WhatsApp */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Kontak (Bisa Diubah)</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <div className="flex-1 relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={waEdit}
                onChange={(e) => setWaEdit(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon Lain</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phoneEdit}
                  onChange={(e) => setPhoneEdit(e.target.value)}
                  placeholder="0812-3456-7890"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
                />
              </div>
              <button
                onClick={handleSavePhone}
                disabled={saving}
                className="px-4 py-2 bg-bpjs-green text-white font-semibold text-sm rounded-lg disabled:opacity-50 flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Semua
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-bpjs-green" />
          <h2 className="text-lg font-bold text-gray-900">Ganti Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini *</label>
            <input
              type="password"
              required
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru *</label>
            <input
              type="password"
              required
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="Minimal 8 karakter"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru *</label>
            <input
              type="password"
              required
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="Ulangi password baru"
            />
          </div>

          {msg && (
            <div
              className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
                msg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {msg.type === 'success' ? (
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Ganti Password
          </button>
        </form>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <p className="font-semibold mb-1">Butuh bantuan?</p>
          <p className="text-blue-700">
            Jika lupa password atau ingin mengubah data profil (nama, email, telepon, sekolah),
            hubungi Admin BPJS Ketenagakerjaan Cabang Cirebon untuk reset.
          </p>
        </div>
      </div>
    </div>
  );
}
