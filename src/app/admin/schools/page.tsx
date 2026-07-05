'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  School as SchoolIcon,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  MapPin,
  Phone,
  User,
  GraduationCap,
  ChevronRight,
  Printer
} from 'lucide-react';
import PrintCredentialsModal, { PrintableCredential } from '@/components/admin/PrintCredentialsModal';

interface School {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  created_at: string;
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [printItems, setPrintItems] = useState<PrintableCredential[] | null>(null);
  const [printingSchoolId, setPrintingSchoolId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPrinting, setBulkPrinting] = useState(false);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schools');
      const data = await res.json();
      if (data.success) setSchools(data.schools);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus sekolah "${name}"? Guru BKK yang ter-link akan kehilangan akses.`)) return;
    const res = await fetch(`/api/schools?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert('Error: ' + data.error);
    } else {
      fetchSchools();
    }
  };

  // Print all BKK credentials di satu sekolah
  const handlePrintAllBKK = async (school: School) => {
    setPrintingSchoolId(school.id);
    try {
      const res = await fetch(`/api/schools/${school.id}/bkk-teachers`);
      const data = await res.json();
      const teachers = data.bkk_teachers || data.teachers || [];
      if (teachers.length === 0) {
        alert(`Belum ada guru BKK di ${school.name}. Tambahkan dulu di halaman detail sekolah.`);
        return;
      }
      const items: PrintableCredential[] = teachers.map((t: any) => ({
        name: t.name,
        idLabel: 'ID BKK',
        idValue: t.bkk_id || '-',
        password: t.raw_password,
        loginUrl: '/bkk/login',
        subInfo: [
          { label: 'Email', value: t.email },
          { label: 'Sekolah', value: school.name },
        ],
      }));
      setPrintItems(items);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setPrintingSchoolId(null);
    }
  };

  // Bulk print BKK dari semua sekolah terpilih
  const handleBulkPrintBKK = async () => {
    setBulkPrinting(true);
    try {
      const allItems: PrintableCredential[] = [];
      for (const sid of selectedIds) {
        const school = schools.find((s) => s.id === sid);
        if (!school) continue;
        const res = await fetch(`/api/schools/${sid}/bkk-teachers`);
        const data = await res.json();
        const teachers = data.bkk_teachers || data.teachers || [];
        for (const t of teachers) {
          allItems.push({
            name: t.name,
            idLabel: 'ID BKK',
            idValue: t.bkk_id || '-',
            password: t.raw_password,
            loginUrl: '/bkk/login',
            subInfo: [
              { label: 'Email', value: t.email },
              { label: 'Sekolah', value: school.name },
            ],
          });
        }
      }
      if (allItems.length === 0) {
        alert('Tidak ada guru BKK di sekolah terpilih.');
        return;
      }
      setPrintItems(allItems);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setBulkPrinting(false);
    }
  };

  // Bulk delete sekolah terpilih
  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!confirm(`Yakin hapus ${count} sekolah terpilih? Guru BKK yang ter-link akan kehilangan akses. Tindakan ini tidak bisa dibatalkan.`)) return;
    for (const id of selectedIds) {
      await fetch(`/api/schools?id=${id}`, { method: 'DELETE' });
    }
    setSelectedIds(new Set());
    fetchSchools();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Sekolah & Guru BKK
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {schools.length} sekolah terdaftar • Klik sekolah untuk kelola guru BKK & lihat magang
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
        >
          <Plus className="w-4 h-4" />
          Tambah Sekolah
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
        </div>
      ) : schools.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <SchoolIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada sekolah. Tambahkan sekolah pertama Anda.</p>
        </div>
      ) : (
        <>
          {/* Bulk action bar */}
          {(() => {
            const selectedCount = selectedIds.size;
            const allSelected = schools.length > 0 && selectedCount === schools.length;
            return (
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(schools.map((s) => s.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-bpjs-green focus:ring-bpjs-green"
                  />
                  <span className="font-medium text-gray-700">
                    {allSelected ? 'Batalkan pilih semua' : 'Pilih semua'} ({schools.length})
                  </span>
                </label>
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">{selectedCount} sekolah dipilih</span>
                    <button
                      onClick={handleBulkPrintBKK}
                      disabled={bulkPrinting}
                      className="inline-flex items-center gap-1 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"
                    >
                      {bulkPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                      Print BKK Terpilih ({selectedCount})
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Sekolah Terpilih ({selectedCount})
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">
                      Batal
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schools.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group ${selectedIds.has(s.id) ? 'ring-2 ring-bpjs-green/40' : ''}`}
            >
              {/* Checkbox + Clickable area → ke detail page */}
              <Link
                href={`/admin/schools/${s.id}`}
                className="block p-4 hover:bg-green-50/30 transition-colors relative"
              >
                {/* Checkbox — positioned top-left, prevent navigation */}
                <div className="absolute top-3 left-3 z-10" onClick={(e) => e.preventDefault()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(s.id);
                        else next.delete(s.id);
                        return next;
                      });
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-bpjs-green focus:ring-bpjs-green"
                  />
                </div>
                <div className="flex items-start justify-between mb-2 pl-6">
                  <div className="w-10 h-10 rounded-lg bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
                    <SchoolIcon className="w-5 h-5 text-bpjs-green" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-bpjs-green group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{s.name}</h3>
                <div className="space-y-1 text-xs text-gray-600">
                  {s.address && (
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="line-clamp-1">{s.address}</span>
                    </div>
                  )}
                  {s.contact_person && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span>{s.contact_person}</span>
                    </div>
                  )}
                  {s.contact_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{s.contact_phone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-bpjs-green/10 text-bpjs-green rounded-full font-medium">
                    <GraduationCap className="w-3 h-3" />
                    Kelola Guru BKK
                  </span>
                </div>
              </Link>

              {/* Action buttons (di luar Link agar tidak navigate) */}
              <div className="px-4 pb-3 flex items-center gap-2 border-t border-gray-100 pt-2 flex-wrap">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handlePrintAllBKK(s);
                  }}
                  disabled={printingSchoolId === s.id}
                  title="Print Kartu Kredensial semua guru BKK di sekolah ini"
                  className="inline-flex items-center gap-1 text-xs text-bpjs-green-dark hover:bg-bpjs-green/10 px-2 py-1 rounded disabled:opacity-50"
                >
                  {printingSchoolId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                  Print BKK
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditing(s);
                    setShowForm(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-blue-700 hover:bg-blue-50 px-2 py-1 rounded"
                >
                  <Edit className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(s.id, s.name);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                >
                  <Trash2 className="w-3 h-3" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {showForm && (
        <SchoolFormModal
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditing(null);
            fetchSchools();
          }}
        />
      )}

      {printItems && (
        <PrintCredentialsModal items={printItems} role="bkk" onClose={() => setPrintItems(null)} />
      )}
    </div>
  );
}

function SchoolFormModal({
  editing,
  onClose,
  onSuccess
}: {
  editing: School | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    address: editing?.address || '',
    contact_person: editing?.contact_person || '',
    contact_phone: editing?.contact_phone || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = '/api/schools';
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Sekolah' : 'Tambah Sekolah Baru'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="SMK Negeri 4 Cirebon"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kontak Person</label>
            <input
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="Kepala BKK"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon Kontak</label>
            <input
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="0231-123456"
            />
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
              className="flex-1 px-4 py-2.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
