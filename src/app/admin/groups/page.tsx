'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Loader2,
  X,
  MessageCircle,
  UserCog,
  UserPlus,
  UserMinus,
  Building2,
  ArrowLeft
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  department: string | null;
  created_by_name: string;
  is_active: boolean;
  created_at: string;
  pembina_count: number;
  peserta_count: number;
  my_role?: string;
}

interface Member {
  id: string;
  user_type: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: any;
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups/list');
      const data = await res.json();
      if (data.success) setGroups(data.groups);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const filtered = groups.filter((g) => {
    const s = search.toLowerCase();
    return !s || g.name.toLowerCase().includes(s) || (g.department || '').toLowerCase().includes(s);
  });

  if (selectedGroup) {
    return <GroupDetail groupId={selectedGroup} onBack={() => { setSelectedGroup(null); fetchGroups(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Kelola Grup Chat
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {groups.length} grup aktif
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
        >
          <Plus className="w-4 h-4" /> Buat Grup Baru
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama grup atau departemen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada grup.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bpjs-blue/30 transition-all cursor-pointer"
              onClick={() => setSelectedGroup(g.id)}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bpjs-blue/10 to-bpjs-blue/5 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-bpjs-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-gray-900">{g.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{g.group_type}</span>
                    {g.department && <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full">{g.department}</span>}
                  </div>
                  {g.description && <p className="text-sm text-gray-500 mb-2 line-clamp-1">{g.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><UserCog className="w-3 h-3" /> {g.pembina_count} pembina</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.peserta_count} peserta</span>
                    <span>Dibuat oleh: {g.created_by_name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CreateGroupModal
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchGroups(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// GroupDetail — Lihat & kelola anggota grup
// ============================================================
function GroupDetail({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const [data, setData] = useState<{ group: any; members: Member[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPembina, setShowAddPembina] = useState(false);
  const [showAddPeserta, setShowAddPeserta] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const d = await res.json();
      if (d.success) setData({ group: d.group, members: d.members });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" /></div>;
  if (!data) return null;

  const { group, members } = data;
  const pembinaMembers = members.filter((m) => m.user_type === 'pembina');
  const pesertaMembers = members.filter((m) => m.user_type === 'peserta');

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-gray-500 hover:text-bpjs-blue text-sm">
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar grup
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bpjs-blue/10 to-bpjs-blue/5 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-7 h-7 text-bpjs-blue" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {group.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{group.group_type}</span>
              {group.department && <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full">{group.department}</span>}
            </div>
            {group.description && <p className="text-sm text-gray-600 mt-2">{group.description}</p>}
            <p className="text-xs text-gray-400 mt-2">Dibuat oleh: {group.created_by_name}</p>
          </div>
          <button
            onClick={() => { if (confirm('Hapus grup ini? Semua chat akan hilang.')) { handleDelete(); } }}
            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
            title="Hapus grup"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-600" /> Pembina ({pembinaMembers.length})
            </h3>
            <button onClick={() => setShowAddPembina(true)} className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-md flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> Tambah
            </button>
          </div>
          {pembinaMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada pembina</p>
          ) : (
            <div className="space-y-2">
              {pembinaMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50/30">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <UserCog className="w-4 h-4 text-purple-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{m.profile?.name}</p>
                    <p className="text-xs text-gray-500">{m.profile?.pembina_id} • {m.profile?.department}</p>
                  </div>
                  {m.role === 'group_admin' && <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-blue-dark rounded-full">Admin</span>}
                  <button onClick={() => handleRemoveMember(m.id)} className="p-1 text-gray-400 hover:text-red-600"><UserMinus className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-bpjs-blue" /> Peserta ({pesertaMembers.length})
            </h3>
            <button onClick={() => setShowAddPeserta(true)} className="text-xs bg-bpjs-blue/10 hover:bg-bpjs-blue/20 text-bpjs-blue px-3 py-1.5 rounded-md flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> Tambah
            </button>
          </div>
          {pesertaMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada peserta</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pesertaMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50/30">
                  <div className="w-8 h-8 rounded-full bg-bpjs-blue/10 flex items-center justify-center">
                    <span className="text-bpjs-blue font-bold text-xs">{(m.profile?.name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{m.profile?.name}</p>
                    <p className="text-xs text-gray-500">{m.profile?.department} • {m.profile?.school_origin}</p>
                  </div>
                  <button onClick={() => handleRemoveMember(m.id)} className="p-1 text-gray-400 hover:text-red-600"><UserMinus className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddPembina && (
        <AddMemberModal groupId={groupId} userType="pembina" onClose={() => setShowAddPembina(false)} onSuccess={() => { setShowAddPembina(false); fetchDetail(); }} />
      )}
      {showAddPeserta && (
        <AddMemberModal groupId={groupId} userType="peserta" onClose={() => setShowAddPeserta(false)} onSuccess={() => { setShowAddPeserta(false); fetchDetail(); }} />
      )}
    </div>
  );

  async function handleDelete() {
    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) onBack();
    else alert(`Error: ${data.error}`);
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Hapus member dari grup?')) return;
    const res = await fetch(`/api/groups/${groupId}/members?member_id=${memberId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchDetail();
    else alert(`Error: ${data.error}`);
  }
}

// ============================================================
// CreateGroupModal
// ============================================================
function CreateGroupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    group_type: 'department',
    department: 'Pelayanan'
  });
  const [selectedPembina, setSelectedPembina] = useState<string[]>([]);
  const [selectedPeserta, setSelectedPeserta] = useState<string[]>([]);
  const [pembinaList, setPembinaList] = useState<any[]>([]);
  const [internList, setInternList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/pembina/list').then((r) => r.json()).then((d) => { if (d.success) setPembinaList(d.pembina); });
    fetch('/api/interns/list').then((r) => r.json()).then((d) => { if (d.success) setInternList(d.interns); });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, member_pembina_ids: selectedPembina, member_intern_ids: selectedPeserta })
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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-bpjs-blue" /> Buat Grup Chat Baru
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Grup *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                placeholder="Grup Magang Pelayanan Q3 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Grup</label>
              <select value={form.group_type} onChange={(e) => setForm({ ...form, group_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                <option value="department">Department</option>
                <option value="project">Proyek Lintas Bidang</option>
                <option value="event">Event/Sementara</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departemen</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
              <option value="Pelayanan">Pelayanan</option>
              <option value="Pemasaran">Pemasaran</option>
              <option value="Keuangan">Keuangan</option>
              <option value="Lintas Bidang">Lintas Bidang</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (opsional)</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              placeholder="Grup kolaborasi pembina & peserta" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Pembina ({selectedPembina.length})</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {pembinaList.filter((p) => p.is_active).map((p) => (
                <label key={p.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedPembina.includes(p.id)}
                    onChange={(e) => setSelectedPembina((s) => e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id))}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm">{p.name} ({p.pembina_id} • {p.department})</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Peserta ({selectedPeserta.length})</label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {internList.filter((i) => i.is_active).map((i) => (
                <label key={i.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedPeserta.includes(i.id)}
                    onChange={(e) => setSelectedPeserta((s) => e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id))}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm">{i.name} ({i.department} • {i.school_origin})</span>
                </label>
              ))}
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Buat Grup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// AddMemberModal
// ============================================================
function AddMemberModal({ groupId, userType, onClose, onSuccess }: { groupId: string; userType: 'pembina' | 'peserta'; onClose: () => void; onSuccess: () => void }) {
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userType === 'pembina') {
      fetch('/api/pembina/list').then((r) => r.json()).then((d) => { if (d.success) setList(d.pembina); });
    } else {
      fetch('/api/interns/list').then((r) => r.json()).then((d) => { if (d.success) setList(d.interns); });
    }
  }, [userType]);

  const submit = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: userType, user_id: selected })
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
          <h3 className="text-lg font-bold text-gray-900">
            Tambah {userType === 'pembina' ? 'Pembina' : 'Peserta'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
            {list.map((item) => (
              <label key={item.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selected === item.id ? 'bg-bpjs-blue/10' : 'hover:bg-gray-50'}`}>
                <input type="radio" checked={selected === item.id} onChange={() => setSelected(item.id)} className="w-4 h-4" />
                <span className="text-sm">{item.name} {userType === 'pembina' ? `(${item.pembina_id})` : `(${item.department})`}</span>
              </label>
            ))}
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
            <button onClick={submit} disabled={loading || !selected} className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Tambah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
