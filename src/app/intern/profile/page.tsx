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
  Check,
  AlertCircle,
  Camera,
  Save,
  Calendar,
  Briefcase,
  Award,
  Zap
} from 'lucide-react';

interface ProfileData {
  id: string;
  name: string;
  username: string;
  major: string;
  department: string;
  school_origin: string | null;
  start_date: string;
  end_date: string;
  total_exp: number;
  streak_count: number;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  is_active: boolean;
  logbook_enabled?: boolean; // deprecated
  created_at: string;
}

export default function InternProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [whatsappEdit, setWhatsappEdit] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/intern/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProfile(d.profile);
          setPhone(d.profile.phone || '');
          setEmailEdit(d.profile.email || '');
          setWhatsappEdit(d.profile.whatsapp || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUploadPhoto = async (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Ukuran foto maksimal 3MB' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'error', text: 'File harus berupa gambar' });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch('/api/intern/upload-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile({ ...profile!, photo_url: data.url });
      setMsg({ type: 'success', text: 'Foto profil berhasil diupload!' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSavePhone = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/intern/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email: emailEdit, whatsapp: whatsappEdit })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: 'success', text: 'Kontak tersimpan!' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" /></div>;
  }

  if (!profile) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Profil Saya
        </h1>
        <p className="text-sm text-white/60 mt-1">Kelola foto profil dan kontak</p>
      </div>

      {/* Photo + Identity */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Photo */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-16 h-16 text-white/30" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-bpjs-yellow text-bpjs-blue-dark rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
              title="Ganti foto profil"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUploadPhoto(e.target.files[0])}
            />
          </div>

          {/* Identity (READ-ONLY) */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-white">{profile.name}</h2>
            <p className="text-sm text-white/60">Peserta Magang</p>
            <div className="flex items-center gap-2 justify-center sm:justify-start mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-yellow rounded-full font-medium">
                {profile.major}
              </span>
              <span className="text-xs px-2 py-0.5 bg-bpjs-blue/20 text-bpjs-blue-light rounded-full font-medium">
                {profile.department}
              </span>
            </div>
            <div className="mt-3 flex justify-center sm:justify-start">
              <ShareButton
                data={{
                  name: profile.name,
                  major: profile.major,
                  department: profile.department,
                  school: profile.school_origin || undefined,
                  totalExp: profile.total_exp,
                  level: Math.floor(profile.total_exp / 100) + 1,
                  tier: 'Participation',
                  timeProgress: 0,
                  daysRemaining: 0,
                  streak: profile.streak_count,
                  type: 'profile'
                }}
                label="Bagikan Profil"
                variant="compact"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Read-only info */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-3">Informasi Magang (Hanya Baca)</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Username</label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-bpjs-yellow" />
              <span className="text-sm font-mono text-white/90">{profile.username}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Institusi</label>
            <div className="flex items-center gap-2 mt-1">
              <SchoolIcon className="w-4 h-4 text-bpjs-yellow" />
              <span className="text-sm text-white/90">{profile.school_origin || '-'}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Periode Magang</label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-bpjs-yellow" />
              <span className="text-sm text-white/90">
                {new Date(profile.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} — {new Date(profile.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Total EXP / Streak</label>
            <div className="flex items-center gap-2 mt-1">
              <Zap className="w-4 h-4 text-bpjs-yellow" />
              <span className="text-sm text-white/90">{profile.total_exp} EXP • {profile.streak_count} hari streak</span>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-white/40 bg-white/5 rounded p-2">
          🔒 Informasi di atas tidak dapat diubah oleh peserta. Hubungi admin BPJS untuk koreksi data.
        </div>
      </div>

      {/* Editable: Contact */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-3">Kontak (Bisa Diubah)</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                value={emailEdit}
                onChange={(e) => setEmailEdit(e.target.value)}
                placeholder="budi@email.com"
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">WhatsApp</label>
            <div className="flex-1 relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="tel"
                value={whatsappEdit}
                onChange={(e) => setWhatsappEdit(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Nomor Telepon Lain</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-3456-7890"
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
                />
              </div>
              <button
                onClick={handleSavePhone}
                disabled={saving}
                className="px-4 py-2 bg-bpjs-yellow text-bpjs-blue-dark font-semibold text-sm rounded-lg disabled:opacity-50 flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Semua
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`glass-card p-3 flex items-start gap-2 ${msg.type === 'success' ? 'bg-bpjs-green/10 border-bpjs-green/30' : 'bg-red-500/10 border-red-400/30'}`}>
          {msg.type === 'success' ? <Check className="w-4 h-4 text-bpjs-green mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />}
          <span className={`text-sm ${msg.type === 'success' ? 'text-bpjs-green' : 'text-red-300'}`}>{msg.text}</span>
        </div>
      )}

      {/* Note */}
      <div className="glass-card p-4">
        <div className="flex items-start gap-2 text-xs text-white/60">
          <AlertCircle className="w-4 h-4 text-bpjs-yellow flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-white/80 mb-1">Yang bisa diubah:</p>
            <ul className="space-y-0.5">
              <li>✅ Foto profil (klik icon kamera)</li>
              <li>✅ Email</li>
              <li>✅ WhatsApp</li>
              <li>✅ Nomor telepon lain</li>
            </ul>
            <p className="font-medium text-white/80 mt-2 mb-1">Yang tidak bisa diubah (hubungi admin):</p>
            <ul className="space-y-0.5">
              <li>🔒 Nama, username, password</li>
              <li>🔒 Jurusan, departemen, institusi</li>
              <li>🔒 Periode magang, EXP, streak</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
