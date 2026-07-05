'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Loader2,
  Save,
  Plus,
  Upload,
  Star,
  X,
  Building2,
  Cpu,
  MapPin,
  Crown,
  Edit,
  Lock,
  Download,
  HardDrive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package
} from 'lucide-react';
import JSZip from 'jszip';
import { LLM_PROVIDERS, LLMProvider } from '@/types';

interface Official {
  id: string;
  name: string;
  nip: string;
  position: string;
  signature_url: string | null;
  is_active: boolean;
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<'office' | 'llm' | 'security' | 'officials'>('office');
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState({
    office_name: 'BPJS Ketenagakerjaan Cabang Cirebon',
    office_address: 'Jl. Evakuasi No. 11B, Karyamulya, Kesambi, Cirebon 45135',
    office_lat: -6.7418620,
    office_lng: 108.5420607,
    geofence_radius_meters: 150
  });
  const [llm, setLlm] = useState<{ provider: LLMProvider; model: string; keyConfigured: boolean }>({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    keyConfigured: false
  });
  const [officials, setOfficials] = useState<Official[]>([]);
  const [saving, setSaving] = useState(false);
  const [showOfficialForm, setShowOfficialForm] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState<Official | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [setRes, offRes] = await Promise.all([fetch('/api/settings/get'), fetch('/api/officials')]);
      const setData = await setRes.json();
      const offData = await offRes.json();
      if (setData.success) {
        const s = setData.settings;
        setOffice({
          office_name: s.office_name || 'BPJS Ketenagakerjaan Cabang Cirebon',
          office_address: s.office_address || '',
          office_lat: parseFloat(s.office_lat) || -6.7418620,
          office_lng: parseFloat(s.office_lng) || 108.5420607,
          geofence_radius_meters: s.geofence_radius_meters || 150
        });
        setLlm({ provider: s.llm_provider || 'groq', model: s.llm_model || 'llama-3.3-70b-versatile', keyConfigured: s.llm_api_key_configured });
      }
      if (offData.success) setOfficials(offData.officials);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveOffice = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(office)
      });
      alert('Pengaturan kantor tersimpan!');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveLlm = async (provider: LLMProvider, model: string) => {
    setSaving(true);
    try {
      await fetch('/api/settings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llm_provider: provider, llm_model: model })
      });
      setLlm({ provider, model, keyConfigured: llm.keyConfigured });
      alert('Provider LLM tersimpan!');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Pengaturan
        </h1>
        <p className="text-gray-500 text-sm mt-1">Konfigurasi kantor, AI provider, dan Kepala Cabang.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
        <button
          onClick={() => setTab('office')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
            tab === 'office' ? 'bg-bpjs-blue text-white' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Building2 className="w-4 h-4" /> Kantor
        </button>
        <button
          onClick={() => setTab('llm')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
            tab === 'llm' ? 'bg-bpjs-blue text-white' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Cpu className="w-4 h-4" /> AI Provider
        </button>
        <button
          onClick={() => setTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
            tab === 'security' ? 'bg-bpjs-blue text-white' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Lock className="w-4 h-4" /> Keamanan & Data
        </button>
        <button
          onClick={() => setTab('officials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
            tab === 'officials' ? 'bg-bpjs-blue text-white' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Crown className="w-4 h-4" /> Kepala Cabang
        </button>
      </div>

      {/* OFFICE TAB */}
      {tab === 'office' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-bpjs-blue" />
            <h2 className="font-semibold text-gray-900">Lokasi Kantor & Geofencing</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kantor</label>
            <input
              value={office.office_name}
              onChange={(e) => setOffice({ ...office, office_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Kantor</label>
            <textarea
              rows={2}
              value={office.office_address}
              onChange={(e) => setOffice({ ...office, office_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0000001"
                value={office.office_lat}
                onChange={(e) => setOffice({ ...office, office_lat: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0000001"
                value={office.office_lng}
                onChange={(e) => setOffice({ ...office, office_lng: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Radius Geofence (meter)</label>
            <input
              type="number"
              min={50}
              max={500}
              value={office.geofence_radius_meters}
              onChange={(e) => setOffice({ ...office, geofence_radius_meters: parseInt(e.target.value) || 150 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
            <p className="text-xs text-gray-500 mt-1">Default: 150m (akurasi GPS indoor 30-100m)</p>
          </div>

          <button
            onClick={saveOffice}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2 rounded-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan
          </button>
        </div>
      )}

      {/* LLM TAB */}
      {tab === 'llm' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-bpjs-blue" />
            <h2 className="font-semibold text-gray-900">AI Provider Configuration</h2>
          </div>

          <p className="text-sm text-gray-600">
            Pilih provider LLM yang ingin digunakan. API key di-set di environment variables (Vercel Settings atau file <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local</code>).
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {LLM_PROVIDERS.map((p) => {
              const isActive = llm.provider === p.id;
              const envKey = process.env.NEXT_PUBLIC_LLM_PROVIDER ? '' : p.envKey; // envKey shown for reference
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isActive
                      ? 'border-bpjs-blue bg-bpjs-blue/5 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{p.label}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.region === 'Western'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.region}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Env: <code className="bg-gray-100 px-1 rounded">{p.envKey}</code>
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-xs px-2 py-0.5 bg-bpjs-blue text-white rounded-full font-medium whitespace-nowrap">
                        AKTIF
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500">Model:</label>
                      <select
                        value={isActive ? llm.model : p.defaultModel}
                        onChange={(e) => saveLlm(p.id, e.target.value)}
                        disabled={saving}
                        className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
                      >
                        {p.availableModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => saveLlm(p.id, p.defaultModel)}
                        disabled={saving}
                        className="w-full text-sm py-1.5 bg-gray-100 hover:bg-bpjs-blue hover:text-white text-gray-700 rounded-md font-medium transition-colors"
                      >
                        Aktifkan
                      </button>
                    )}

                    <a
                      href={p.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-bpjs-blue hover:underline text-center"
                    >
                      Dapatkan API Key →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>Cara update API key:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
              <li>
                Set env var <code className="bg-amber-100 px-1 rounded">{llm.provider.toUpperCase()}_API_KEY</code> di Vercel Project Settings → Environment Variables
              </li>
              <li>Redeploy aplikasi (Vercel auto-redeploys on env change)</li>
              <li>Cek status "key configured" akan berubah menjadi hijau</li>
            </ol>
          </div>
        </div>
      )}

      {/* SECURITY & DATA TAB */}
      {tab === 'security' && (
        <SecurityTab />
      )}

      {/* OFFICIALS TAB */}
      {tab === 'officials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-bpjs-blue" />
              <h2 className="font-semibold text-gray-900">Daftar Kepala Cabang</h2>
            </div>
            <button
              onClick={() => setShowOfficialForm(true)}
              className="inline-flex items-center gap-1 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          {officials.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
              <Crown className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Belum ada Kepala Cabang.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {officials.map((o) => (
                <OfficialCard key={o.id} official={o} onUpdated={fetchAll} onEdit={() => {
                  setEditingOfficial(o);
                  setShowOfficialForm(true);
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {showOfficialForm && (
        <OfficialFormModal
          editing={editingOfficial}
          onClose={() => {
            setShowOfficialForm(false);
            setEditingOfficial(null);
          }}
          onSuccess={() => {
            setShowOfficialForm(false);
            setEditingOfficial(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function OfficialCard({ official, onUpdated, onEdit }: { official: Official; onUpdated: () => void; onEdit: () => void }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('signature', file);
      fd.append('official_id', official.id);
      const res = await fetch('/api/upload/signature', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdated();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSetActive = async () => {
    await fetch('/api/officials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: official.id, set_active: true })
    });
    onUpdated();
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus ${official.name}?`)) return;
    await fetch(`/api/officials?id=${official.id}`, { method: 'DELETE' });
    onUpdated();
  };

  return (
    <div className={`bg-white rounded-xl border p-4 ${official.is_active ? 'border-green-400 bg-green-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-lg bg-bpjs-blue/10 flex items-center justify-center flex-shrink-0">
          {official.signature_url ? (
            <img src={official.signature_url} alt="Signature" className="w-full h-full object-contain" />
          ) : (
            <Crown className="w-8 h-8 text-bpjs-blue/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{official.name}</h3>
            {official.is_active && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                <Star className="w-3 h-3" /> AKTIF
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{official.position}</p>
          {official.nip && <p className="text-xs text-gray-400 mt-0.5">NIP: {official.nip}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium px-2.5 py-1.5 rounded-md"
        >
          <Edit className="w-3 h-3" /> Edit
        </button>
        <label className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-1.5 rounded-md cursor-pointer">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Upload TTD
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
        {!official.is_active && (
          <button
            onClick={handleSetActive}
            className="inline-flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium px-2.5 py-1.5 rounded-md"
          >
            <Star className="w-3 h-3" /> Set Aktif
          </button>
        )}
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium px-2.5 py-1.5 rounded-md"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

function OfficialFormModal({
  editing,
  onClose,
  onSuccess
}: {
  editing: Official | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    nip: editing?.nip || '',
    position: editing?.position || 'Kepala Kantor Cabang',
    set_active: editing ? editing.is_active : true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        // Update existing official
        const res = await fetch('/api/officials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editing.id,
            name: form.name,
            nip: form.nip,
            position: form.position,
            set_active: form.set_active
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        // Create new official
        const res = await fetch('/api/officials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      onSuccess();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {editing ? 'Edit Kepala Cabang' : 'Tambah Kepala Cabang'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Zainal Abidin A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIP</label>
            <input
              value={form.nip}
              onChange={(e) => setForm({ ...form, nip: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
            <input
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.set_active}
              onChange={(e) => setForm({ ...form, set_active: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Set sebagai Kepala Cabang aktif</span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// SecurityTab — Ubah password admin + Export data
// ============================================================
function SecurityTab() {
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdMsg({ type: 'error', text: 'Password baru dan konfirmasi tidak cocok' });
      return;
    }
    if (pwdForm.new_password.length < 8) {
      setPwdMsg({ type: 'error', text: 'Password baru minimal 8 karakter' });
      return;
    }
    setPwdLoading(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwdForm.current_password, new_password: pwdForm.new_password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwdMsg({ type: 'success', text: 'Password berhasil diubah!' });
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleExportInterns = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/interns/list');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const interns = data.interns || [];
      // CSV format
      const headers = ['Nama', 'Username', 'Password', 'Jurusan', 'Departemen', 'Institusi', 'Mulai', 'Selesai', 'EXP', 'Streak', 'Aktif'];
      const rows = interns.map((i: any) => [
        `"${i.name || ''}"`,
        `"${i.username || ''}"`,
        `"${i.raw_password || ''}"`,
        `"${i.major || ''}"`,
        `"${i.department || ''}"`,
        `"${i.school_origin || ''}"`,
        `"${i.start_date || ''}"`,
        `"${i.end_date || ''}"`,
        i.total_exp || 0,
        i.streak_count || 0,
        i.is_active ? 'Ya' : 'Tidak'
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-peserta-magang-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Error export: ' + e.message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-bpjs-blue" />
          <h2 className="font-semibold text-gray-900">Ubah Password Admin</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini *</label>
            <input
              type="password"
              required
              value={pwdForm.current_password}
              onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru * (min 8 karakter)</label>
            <input
              type="password"
              required
              value={pwdForm.new_password}
              onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru *</label>
            <input
              type="password"
              required
              value={pwdForm.confirm_password}
              onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>
          {pwdMsg && (
            <div className={`rounded-lg p-3 text-sm ${pwdMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {pwdMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={pwdLoading}
            className="bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {pwdLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Lock className="w-4 h-4" /> Ubah Password
          </button>
        </form>
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          ⚠️ Password default adalah <strong>Magang@Cerdas2026!BPJS#Crb</strong>. Segera ubah ke password yang kuat untuk keamanan.
        </div>
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-bpjs-blue" />
          <h2 className="font-semibold text-gray-900">Export Data</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Download data untuk backup atau rekapan manual.</p>
        <div className="space-y-2">
          <button
            onClick={handleExportInterns}
            disabled={exportLoading}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Data Peserta Magang (CSV)</p>
                <p className="text-xs text-gray-500">Nama, username, password, jurusan, departemen, EXP, dll</p>
              </div>
            </div>
            {exportLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          💡 File CSV bisa dibuka di Excel/Google Sheets untuk rekapan atau backup.
        </div>
      </div>

      {/* Storage Management */}
      <StorageManagement />
    </div>
  );
}

// ============================================================
// StorageManagement — Backup & Clean Supabase Storage
// 100% manual, tidak ada auto
// ============================================================
function StorageManagement() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [confirmText, setConfirmText] = useState<Record<string, string>>({});
  const [showCleanConfirm, setShowCleanConfirm] = useState<Record<string, boolean>>({});

  const buckets = [
    { id: 'attendance-photos', label: 'Foto Kehadiran', icon: '📸', desc: 'Foto selfie check-in/out, foto profil, surat dokter', defaultDays: 30 },
    { id: 'chat-attachments', label: 'File Chat', icon: '💬', desc: 'Foto & document di chat grup', defaultDays: 90 }
  ];

  // Backup files: download as ZIP (client-side)
  const handleBackup = async (bucketId: string, olderThanDays: number) => {
    const key = `${bucketId}-backup`;
    setLoading((p) => ({ ...p, [key]: true }));
    setProgress((p) => ({ ...p, [key]: 0 }));
    setStatus((p) => ({ ...p, [key]: 'Mengambil daftar file...' }));
    setError((p) => ({ ...p, [key]: '' }));

    try {
      // 1. Fetch file list from API
      const res = await fetch(`/api/storage/list?bucket=${bucketId}&older_than_days=${olderThanDays}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const files = data.files || [];
      if (files.length === 0) {
        setStatus((p) => ({ ...p, [key]: 'Tidak ada file untuk di-backup' }));
        return;
      }

      setStatus((p) => ({ ...p, [key]: `Mengunduh ${files.length} file...` }));

      // 2. Download files and build ZIP (client-side)
      const zip = new JSZip();
      let downloaded = 0;

      for (const file of files) {
        try {
          const fileRes = await fetch(file.url);
          if (!fileRes.ok) throw new Error(`Failed to fetch ${file.name}`);
          const blob = await fileRes.blob();
          zip.file(file.name, blob);
          downloaded++;
          setProgress((p) => ({ ...p, [key]: Math.round((downloaded / files.length) * 100) }));
        } catch (e) {
          // Skip file if fails
        }
      }

      // 3. Generate ZIP and download
      setStatus((p) => ({ ...p, [key]: 'Membuat file ZIP...' }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${bucketId}-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus((p) => ({ ...p, [key]: `✅ ${downloaded} file di-backup ke komputer Anda (${data.total_size_mb} MB)` }));
    } catch (e: any) {
      setError((p) => ({ ...p, [key]: e.message }));
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  // Clean files: delete from storage + update DB
  const handleClean = async (bucketId: string, olderThanDays: number) => {
    const key = `${bucketId}-clean`;
    const confirmKey = `${bucketId}-confirm`;
    if (confirmText[confirmKey] !== 'HAPUS') return;

    setLoading((p) => ({ ...p, [key]: true }));
    setStatus((p) => ({ ...p, [key]: 'Menghapus file...' }));
    setError((p) => ({ ...p, [key]: '' }));

    try {
      const res = await fetch('/api/storage/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: bucketId, older_than_days: olderThanDays })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus((p) => ({ ...p, [key]: `✅ ${data.deleted_count} file dihapus. ${data.freed_size_mb} MB dibebaskan.` }));
      setShowCleanConfirm((p) => ({ ...p, [bucketId]: false }));
      setConfirmText((p) => ({ ...p, [confirmKey]: '' }));
    } catch (e: any) {
      setError((p) => ({ ...p, [key]: e.message }));
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <HardDrive className="w-5 h-5 text-bpjs-blue" /> Storage Management
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Backup & bersihkan file dari Supabase Storage. Data (kehadiran, chat) tetap tersimpan, hanya file yang dihapus.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
        ⚠️ <strong>Urutan yang disarankan:</strong> Backup dulu (download ZIP), pastikan ZIP tersimpan di komputer, baru Clean.
        File yang sudah dihapus <strong>TIDAK bisa dikembalikan</strong>.
      </div>

      <div className="space-y-4">
        {buckets.map((bucket) => {
          const backupKey = `${bucket.id}-backup`;
          const cleanKey = `${bucket.id}-clean`;
          const confirmKey = `${bucket.id}-confirm`;
          return (
            <div key={bucket.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">{bucket.icon}</span> {bucket.label}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{bucket.desc}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">bucket: {bucket.id}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Clean: &gt; {bucket.defaultDays} hari</div>
                </div>
              </div>

              {/* Status messages */}
              {status[backupKey] && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {status[backupKey]}
                </div>
              )}
              {status[cleanKey] && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {status[cleanKey]}
                </div>
              )}
              {error[backupKey] && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 mb-2">{error[backupKey]}</div>
              )}
              {error[cleanKey] && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 mb-2">{error[cleanKey]}</div>
              )}

              {/* Progress bar */}
              {loading[backupKey] && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress backup...</span>
                    <span>{progress[backupKey] || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-bpjs-blue transition-all" style={{ width: `${progress[backupKey] || 0}%` }} />
                  </div>
                </div>
              )}

              {/* Backup button */}
              <button
                onClick={() => handleBackup(bucket.id, bucket.defaultDays)}
                disabled={loading[backupKey] || loading[cleanKey]}
                className="w-full flex items-center justify-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 mb-2"
              >
                {loading[backupKey] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                {loading[backupKey] ? 'Memproses...' : `💾 Backup File > ${bucket.defaultDays} hari (ZIP)`}
              </button>

              {/* Clean section */}
              {!showCleanConfirm[bucket.id] ? (
                <button
                  onClick={() => setShowCleanConfirm((p) => ({ ...p, [bucket.id]: true }))}
                  disabled={loading[backupKey] || loading[cleanKey]}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" /> Clean File &gt; {bucket.defaultDays} hari
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800">
                      <strong>Peringatan!</strong> File akan dihapus permanen dari server.
                      Pastikan sudah backup (download ZIP) sebelum lanjut.
                      Data kehadiran/chat tetap tersimpan, hanya file yang dihapus.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-red-700 mb-1">
                      Ketik <strong>HAPUS</strong> untuk konfirmasi:
                    </label>
                    <input
                      type="text"
                      value={confirmText[confirmKey] || ''}
                      onChange={(e) => setConfirmText((p) => ({ ...p, [confirmKey]: e.target.value }))}
                      placeholder="HAPUS"
                      className="w-full px-3 py-1.5 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowCleanConfirm((p) => ({ ...p, [bucket.id]: false })); setConfirmText((p) => ({ ...p, [confirmKey]: '' })); }}
                      className="flex-1 px-3 py-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleClean(bucket.id, bucket.defaultDays)}
                      disabled={confirmText[confirmKey] !== 'HAPUS' || loading[cleanKey]}
                      className="flex-1 inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                    >
                      {loading[cleanKey] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Hapus Permanen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-[10px] text-gray-400 text-center">
        💡 Backup = file ZIP tersimpan di komputer Anda. Clean = hapus dari server (data tetap di database).
        Semua manual, tidak ada auto-clean.
      </div>
    </div>
  );
}
