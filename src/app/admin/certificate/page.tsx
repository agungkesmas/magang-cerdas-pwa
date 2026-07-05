'use client';

import { useState, useEffect, useCallback } from 'react';
import { Award, Loader2, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Intern {
  id: string;
  name: string;
  major: string;
  department: string;
  end_date: string;
  total_exp: number;
  days_remaining: number;
  certificate_unlocked: boolean;
}

interface Official {
  id: string;
  name: string;
  nip: string;
  position: string;
  signature_url: string | null;
  is_active: boolean;
}

export default function AdminCertificatePage() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [official, setOfficial] = useState<Official | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [internRes, offRes] = await Promise.all([fetch('/api/interns/list'), fetch('/api/officials')]);
      const internData = await internRes.json();
      const offData = await offRes.json();
      if (internData.success) setInterns(internData.interns);
      if (offData.success) {
        const active = offData.officials.find((o: Official) => o.is_active);
        setOfficial(active || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleIssue = async (intern: Intern) => {
    if (!confirm(`Terbitkan sertifikat untuk ${intern.name}? EXP: ${intern.total_exp}`)) return;
    setIssuing(intern.id);
    try {
      const res = await fetch('/api/certificate/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intern_id: intern.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`✅ Sertifikat terbit! Verification ID: ${data.certificate.verification_id}`);
      fetchAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIssuing(null);
    }
  };

  const tierInfo = (exp: number) => {
    if (exp >= 1000) return { tier: 'Excellence', color: 'bg-bpjs-yellow text-bpjs-blue-dark', icon: '🏆' };
    if (exp >= 500) return { tier: 'Competent', color: 'bg-bpjs-green text-white', icon: '✅' };
    return { tier: 'Participation', color: 'bg-gray-300 text-gray-700', icon: '📋' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Penerbitan Sertifikat
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Pilih magang untuk menerbitkan sertifikat. Tier ditentukan dari EXP.
        </p>
      </div>

      {/* Official status warning */}
      {!official && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-900">Belum ada Kepala Cabang aktif</p>
            <p className="text-sm text-orange-700 mt-1">
              Set Kepala Cabang aktif di halaman Pengaturan sebelum menerbitkan sertifikat.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
        </div>
      ) : interns.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada magang.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {interns.map((intern) => {
            const info = tierInfo(intern.total_exp);
            return (
              <div
                key={intern.id}
                className={`bg-white rounded-xl border p-4 ${
                  intern.certificate_unlocked ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-bpjs-blue/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-bpjs-blue font-bold text-lg">{intern.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{intern.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{intern.major}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{intern.department}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-bpjs-yellow" />
                          {intern.total_exp} EXP
                        </span>
                        <span>•</span>
                        <span>Selesai: {new Date(intern.end_date).toLocaleDateString('id-ID')}</span>
                        <span>•</span>
                        <span>{intern.days_remaining} hari lagi</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`text-xs px-3 py-1.5 rounded-full font-bold ${info.color}`}>
                      {info.icon} {info.tier}
                    </div>
                    {intern.certificate_unlocked ? (
                      <div className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-3 py-1.5 rounded-lg text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Sudah Terbit
                      </div>
                    ) : (
                      <button
                        onClick={() => handleIssue(intern)}
                        disabled={issuing === intern.id || !official}
                        className="inline-flex items-center gap-1 bg-bpjs-blue hover:bg-bpjs-blue-dark disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                      >
                        {issuing === intern.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                        Terbitkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
