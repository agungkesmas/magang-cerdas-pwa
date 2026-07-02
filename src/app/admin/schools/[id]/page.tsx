'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  School as SchoolIcon,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  X,
  ChevronLeft,
  MapPin,
  Phone,
  User,
  Mail,
  AlertCircle,
  BookX,
  BookOpen
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  created_at: string;
}

interface BKKTeacher {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  raw_password: string;
  last_login_at: string | null;
  created_at: string;
}

interface Intern {
  id: string;
  name: string;
  major: string;
  major_id?: string | null;
  department: string;
  total_exp: number;
  is_active: boolean;
  logbook_enabled: boolean;
  school_origin?: string | null;
}

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;

  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<BKKTeacher[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [majors, setMajors] = useState<{ id: string; name: string; code?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<BKKTeacher | null>(null);
  const [showSchoolEdit, setShowSchoolEdit] = useState(false);
  const [showMajorForm, setShowMajorForm] = useState(false);
  const [editingMajor, setEditingMajor] = useState<{ id: string; name: string; code?: string | null } | null>(null);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolRes, internsRes, majorsRes] = await Promise.all([
        fetch(`/api/schools`),
        fetch('/api/interns/list'),
        fetch(`/api/majors?school_id=${schoolId}`)
      ]);
      const schoolData = await schoolRes.json();
      const internsData = await internsRes.json();
      const majorsData = await majorsRes.json();

      let schoolName: string | null = null;
      if (schoolData.success) {
        const found = schoolData.schools.find((s: School) => s.id === schoolId);
        if (!found) {
          alert('Institusi tidak ditemukan');
          router.push('/admin/schools');
          return;
        }
        setSchool(found);
        schoolName = found.name;
      }
      if (internsData.success && schoolName) {
        setInterns(internsData.interns.filter((i: Intern) => i.school_origin === schoolName));
      }
      if (majorsData.success) {
        setMajors(majorsData.majors || []);
      }

      // Fetch BKK teachers linked to this school
      const tRes = await fetch(`/api/schools/${schoolId}/bkk-teachers`);
      const tData = await tRes.json();
      if (tData.success) {
        setTeachers(tData.teachers);
      }
    } finally {
      setLoading(false);
    }
  }, [schoolId, router]);

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

Sekolah yang Anda bimbing: ${school?.name}

Login di: ${window.location.origin}/bkk/login

Selamat membimbing siswa magang di BPJS Ketenagakerjaan Cabang Cirebon!`;
    navigator.clipboard.writeText(shareText);
    setCopied(`share-${t.id}`);
    setTimeout(() => setCopied(null), 2000);
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

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Yakin hapus guru BKK ini? Tindakan tidak bisa dibatalkan.')) return;
    await fetch(`/api/bkk-teachers/update?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const handleDeleteSchool = async () => {
    if (!confirm(`Hapus sekolah "${school?.name}"? Guru BKK yang ter-link akan kehilangan akses.`)) return;
    const res = await fetch(`/api/schools?id=${schoolId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert('Error: ' + data.error);
    } else {
      router.push('/admin/schools');
    }
  };

  if (loading || !school) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link href="/admin/schools" className="inline-flex items-center gap-1 text-gray-500 hover:text-bpjs-green text-sm">
        <ChevronLeft className="w-4 h-4" /> Kembali ke daftar sekolah
      </Link>

      {/* School Header */}
      <div className="bg-gradient-to-br from-bpjs-green to-bpjs-green-dark rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <SchoolIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {school.name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-white/80 flex-wrap">
                {school.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {school.address}
                  </span>
                )}
                {school.contact_person && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" /> {school.contact_person}
                  </span>
                )}
                {school.contact_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {school.contact_phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSchoolEdit(true)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"
              title="Edit sekolah"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteSchool}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg"
              title="Hapus sekolah"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{teachers.length}</div>
            <div className="text-xs text-white/70">Guru BKK</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{majors.length}</div>
            <div className="text-xs text-white/70">Jurusan</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{interns.filter((i) => i.is_active).length}</div>
            <div className="text-xs text-white/70">Peserta Aktif</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{interns.length}</div>
            <div className="text-xs text-white/70">Total Peserta</div>
          </div>
        </div>
      </div>

      {/* Majors Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-bpjs-green" />
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Jurusan ({majors.length})
            </h2>
          </div>
          <button
            onClick={() => setShowMajorForm(true)}
            className="inline-flex items-center gap-1 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Tambah Jurusan
          </button>
        </div>
        {majors.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">Belum ada jurusan untuk institusi ini.</p>
            <p className="text-xs text-gray-400 mt-1">Tambahkan jurusan agar bisa dipilih saat membuat peserta magang.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {majors.map((m) => {
              const count = interns.filter((i) => i.major_id === m.id || i.major === m.name).length;
              return (
                <div key={m.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm truncate">{m.name}</div>
                    <div className="text-xs text-gray-500">
                      {m.code && <span className="font-mono">{m.code} • </span>}
                      {count} peserta
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setEditingMajor(m)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit jurusan"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Hapus jurusan "${m.name}"?`)) return;
                        const res = await fetch(`/api/majors?id=${m.id}`, { method: 'DELETE' });
                        if (res.ok) fetchAll();
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Hapus jurusan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BKK Teachers Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-bpjs-green" />
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Guru BKK ({teachers.length})
            </h2>
          </div>
          <button
            onClick={() => {
              setEditingTeacher(null);
              setShowTeacherForm(true);
            }}
            className="inline-flex items-center gap-1 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Tambah Guru BKK
          </button>
        </div>

        {teachers.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm mb-2">Belum ada guru BKK untuk sekolah ini.</p>
            <p className="text-xs text-gray-400">Klik "Tambah Guru BKK" untuk membuat akun guru pembimbing.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {teachers.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${
                  t.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Identity */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-bpjs-green" />
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
                          <Mail className="w-3 h-3" /> {t.email}
                        </span>
                        {t.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {t.phone}
                          </span>
                        )}
                        {t.last_login_at && (
                          <span>Login: {new Date(t.last_login_at).toLocaleDateString('id-ID')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Credentials + actions */}
                  <div className="flex flex-col gap-2 min-w-0 lg:w-64">
                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Kredensial Login</div>
                      <div className="flex items-center gap-1 text-xs font-mono">
                        <span className="text-gray-700 truncate">{t.email}</span>
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
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => handleShareCreds(t)}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-xs font-semibold px-2 py-1.5 rounded-md"
                      >
                        {copied === `share-${t.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                      <button
                        onClick={() => {
                          setEditingTeacher(t);
                          setShowTeacherForm(true);
                        }}
                        className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleResetPwd(t.id)}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md"
                        title="Reset password"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(t)}
                        className={`p-1.5 rounded-md ${
                          t.is_active
                            ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                        title={t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {t.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(t.id)}
                        className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
                        title="Hapus"
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
      </div>

      {/* Peserta Magang dari institusi ini — grouped by jurusan */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-bpjs-blue" />
          <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Peserta Magang dari {school.name} ({interns.length})
          </h2>
        </div>
        {interns.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            Belum ada peserta magang dari institusi ini.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group by jurusan */}
            {(() => {
              // Group interns by major (use major_id match ke majors table, fallback ke major string)
              const groups: Record<string, { name: string; interns: typeof interns }> = {};
              interns.forEach((i) => {
                let groupName = i.major || 'Tanpa Jurusan';
                // Coba match ke majors untuk dapat nama canonical
                const matchedMajor = majors.find((m) => m.id === i.major_id || m.name === i.major);
                if (matchedMajor) groupName = matchedMajor.name;
                if (!groups[groupName]) groups[groupName] = { name: groupName, interns: [] };
                groups[groupName].interns.push(i);
              });
              const groupList = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
              return groupList.map((group) => (
                <div key={group.name} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-bpjs-green" />
                      <span className="font-semibold text-gray-900 text-sm">{group.name}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full font-medium">
                      {group.interns.length} peserta
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                    {group.interns.map((i) => (
                      <Link
                        key={i.id}
                        href={`/admin/interns`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-bpjs-blue/30 hover:bg-blue-50/30 transition-all"
                      >
                        <div className="w-8 h-8 rounded-full bg-bpjs-blue/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-bpjs-blue font-bold text-sm">{i.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{i.name}</p>
                          <p className="text-xs text-gray-500">
                            {i.department} • {i.total_exp} EXP
                          </p>
                        </div>
                        {!i.logbook_enabled && (
                          <span title="Logbook dinonaktifkan">
                            <BookX className="w-4 h-4 text-orange-500" />
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Modals */}
      {showMajorForm && (
        <MajorFormModal
          schoolId={schoolId}
          editing={editingMajor}
          onClose={() => {
            setShowMajorForm(false);
            setEditingMajor(null);
          }}
          onSuccess={() => {
            setShowMajorForm(false);
            setEditingMajor(null);
            fetchAll();
          }}
        />
      )}

      {showTeacherForm && (
        <BKKTeacherFormModal
          schoolId={schoolId}
          schoolName={school.name}
          editing={editingTeacher}
          onClose={() => {
            setShowTeacherForm(false);
            setEditingTeacher(null);
          }}
          onSuccess={(creds) => {
            if (creds && !editingTeacher) {
              setCreatedCreds(creds);
            }
            setShowTeacherForm(false);
            setEditingTeacher(null);
            fetchAll();
          }}
        />
      )}

      {showSchoolEdit && (
        <SchoolEditModal
          school={school}
          onClose={() => setShowSchoolEdit(false)}
          onSuccess={() => {
            setShowSchoolEdit(false);
            fetchAll();
          }}
        />
      )}

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
                <div className="text-sm">{school.name}</div>
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
    </div>
  );
}

// ============================================================
// BKK Teacher Form Modal (auto-link ke school ini)
// ============================================================
function BKKTeacherFormModal({
  schoolId,
  schoolName,
  editing,
  onClose,
  onSuccess
}: {
  schoolId: string;
  schoolName: string;
  editing: BKKTeacher | null;
  onClose: () => void;
  onSuccess: (creds: any | null) => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    email: editing?.email || '',
    phone: editing?.phone || '',
    custom_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
            school_ids: [schoolId] // Tetap link ke sekolah ini
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onSuccess(null);
      } else {
        // Create new — auto-link ke sekolah ini saja
        const res = await fetch('/api/bkk-teachers/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            school_ids: [schoolId],
            custom_password: form.custom_password || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onSuccess({
          name: data.teacher.name,
          email: data.teacher.email,
          password: data.credentials.password,
          shareText: data.credentials.shareText
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {editing ? 'Edit Guru BKK' : 'Tambah Guru BKK'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Sekolah: {schoolName}</p>
          </div>
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
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password (opsional)</label>
              <input
                value={form.custom_password}
                onChange={(e) => setForm({ ...form, custom_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
                placeholder="Kosongkan untuk auto-generate"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generate format: Bkk2026!xxxx</p>
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

// ============================================================
// School Edit Modal (reuse dari page list)
// ============================================================
function SchoolEditModal({
  school,
  onClose,
  onSuccess
}: {
  school: School;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: school.name,
    address: school.address || '',
    contact_person: school.contact_person || '',
    contact_phone: school.contact_phone || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/schools', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: school.id, ...form })
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
          <h3 className="text-lg font-bold text-gray-900">Edit Sekolah</h3>
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon Kontak</label>
            <input
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
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

// ============================================================
// MajorFormModal — Tambah/Edit jurusan
// ============================================================
function MajorFormModal({
  schoolId,
  editing,
  onClose,
  onSuccess
}: {
  schoolId: string;
  editing: { id: string; name: string; code?: string | null } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    code: editing?.code || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editing) {
        const res = await fetch('/api/majors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, name: form.name, code: form.code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        const res = await fetch('/api/majors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_id: schoolId, name: form.name, code: form.code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
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
            {editing ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Jurusan *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="Rekayasa Perangkat Lunak"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Jurusan (opsional)</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              placeholder="RPL"
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
