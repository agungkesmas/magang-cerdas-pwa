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
  Edit
} from 'lucide-react';
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
  const [tab, setTab] = useState<'office' | 'llm' | 'officials'>('office');
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Kantor</label>
            <textarea
              rows={2}
              value={office.office_address}
              onChange={(e) => setOffice({ ...office, office_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0000001"
                value={office.office_lng}
                onChange={(e) => setOffice({ ...office, office_lng: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Zainal Abidin A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIP</label>
            <input
              value={form.nip}
              onChange={(e) => setForm({ ...form, nip: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
            <input
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
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
