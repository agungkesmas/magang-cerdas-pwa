'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Camera,
  Loader2,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Navigation,
  RotateCcw,
  X,
  CameraOff,
  Calendar,
  FileText,
  Send,
  Clock as ClockIcon,
  XCircle
} from 'lucide-react';

export default function InternAttendancePage() {
  const [todayAtt, setTodayAtt] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'check-in' | 'check-out' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ exp: number; total: number; distance: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');
  const [geoInfo, setGeoInfo] = useState<{ distance: number; within: boolean } | null>(null);

  // Camera modal state (getUserMedia — kamera depan live)
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Leave request state
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [todayLeave, setTodayLeave] = useState<any | null>(null);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes] = await Promise.all([
        fetch('/api/attendance/list?limit=10'),
        fetch('/api/leave/list')
      ]);
      const attData = await attRes.json();
      const leaveData = await leaveRes.json();
      if (attData.success) {
        const today = new Date().toISOString().split('T')[0];
        setTodayAtt(
          (attData.attendance || []).filter((a: any) => a.timestamp?.startsWith(today))
        );
      }
      if (leaveData.success) {
        setMyLeaves(leaveData.leave_requests || []);
        const today = new Date().toISOString().split('T')[0];
        const todayL = (leaveData.leave_requests || []).find(
          (lr: any) => lr.status === 'approved' && today >= lr.start_date && today <= lr.end_date
        );
        setTodayLeave(todayL || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  // Cleanup camera stream saat unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const checkedIn = todayAtt.some((a) => a.type === 'Check-In');
  const checkedOut = todayAtt.some((a) => a.type === 'Check-Out');

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS tidak didukung di browser ini. Gunakan Chrome atau Safari terbaru.'));
        return;
      }

      // Step 1: Try high accuracy first (GPS satellite)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          // Step 2: If high accuracy fails, try with low accuracy (network/Wi-Fi based)
          if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err2) => {
                // Step 3: Last resort — try with maximumAge (cached position)
                navigator.geolocation.getCurrentPosition(
                  (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                  (err3) => {
                    let msg = 'Gagal mendapatkan lokasi GPS. ';
                    if (err3.code === 1) msg += 'Izinkan akses lokasi di pengaturan browser Anda.';
                    else if (err3.code === 2) msg += 'Sinyal GPS lemah. Coba di luar ruangan atau dekat jendela.';
                    else if (err3.code === 3) msg += 'Waktu habis. Coba lagi.';
                    else msg += err3.message || 'Error tidak diketahui.';
                    reject(new Error(msg));
                  },
                  { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                );
              },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
            );
          } else if (err.code === 1) {
            // PERMISSION_DENIED
            reject(new Error('Akses lokasi ditolak. Buka pengaturan browser → izinkan akses lokasi untuk MAGANG-CERDAS.'));
          } else {
            reject(new Error(err.message || 'Gagal mendapatkan lokasi GPS.'));
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
      );
    });
  };

  // ============================================================
  // Camera: getUserMedia (kamera depan live)
  // ============================================================
  const openCamera = useCallback(async () => {
    setCameraError(null);
    setCameraOpen(true);
    setCameraStarting(true);

    // Cek apakah getUserMedia didukung
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser tidak mendukung akses kamera langsung. Gunakan browser modern (Chrome/Safari).');
      setCameraStarting(false);
      return;
    }

    try {
      // Request kamera depan (facingMode: 'user')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      streamRef.current = stream;

      // Set cameraStarting ke false DULU supaya video element ter-render
      setCameraStarting(false);

      // Lalu set srcObject di next tick (video element sudah ada di DOM)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (e: any) {
      let msg = 'Gagal mengakses kamera';
      if (e.name === 'NotAllowedError') {
        msg = 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu coba lagi.';
      } else if (e.name === 'NotFoundError') {
        msg = 'Kamera tidak ditemukan di perangkat ini.';
      } else if (e.name === 'NotReadableError') {
        msg = 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.';
      } else if (e.message) {
        msg = e.message;
      }
      setCameraError(msg);
      setCameraStarting(false);
    }
  }, []);

  const closeCamera = useCallback(() => {
    // Stop semua track
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraError(null);
    setCameraStarting(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size = video size, tapi cap max 640px untuk kompresi
    const maxW = 640;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const scale = Math.min(1, maxW / vw);
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);

    // Mirror horizontal (karena kamera depan biasanya mirror)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert ke blob dengan quality lebih rendah untuk size lebih kecil
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onload = () => setPhoto(reader.result as string);
        reader.readAsDataURL(file);
        closeCamera();
      },
      'image/jpeg',
      0.7
    );
  }, [closeCamera]);

  const handleAction = async (type: 'check-in' | 'check-out') => {
    setError('');
    setAction(type);
    setGeoStatus('checking');

    try {
      // 1. Get GPS location
      const { lat, lng } = await getLocation();

      // 2. Need photo (mandatory for check-in, optional for check-out)
      if (type === 'check-in' && !photoFile) {
        setError('Foto selfie wajib untuk check-in');
        setAction(null);
        setGeoStatus('idle');
        return;
      }

      // 3. Upload photo if available
      let photoUrl: string | null = null;
      if (photoFile) {
        setGeoStatus('checking'); // keep showing loading
        const fd = new FormData();
        fd.append('photo', photoFile);
        const upRes = await fetch('/api/upload/attendance-photo', { method: 'POST', body: fd });
        if (!upRes.ok) {
          let errMsg = 'Upload foto gagal';
          try {
            const upData = await upRes.json();
            errMsg = upData.error || errMsg;
          } catch {
            errMsg = `Upload foto gagal (HTTP ${upRes.status}). Coba lagi.`;
          }
          throw new Error(errMsg);
        }
        const upData = await upRes.json();
        photoUrl = upData.url;
      }

      // 4. Submit check-in/out
      const endpoint = type === 'check-in' ? '/api/attendance/check-in' : '/api/attendance/check-out';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, photo_url: photoUrl })
      });
      if (!res.ok) {
        let errMsg = `Gagal (${res.status})`;
        try {
          const data = await res.json();
          errMsg = data.error || errMsg;
        } catch {
          errMsg = `Server error (HTTP ${res.status}). Coba lagi.`;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();

      setSuccess({
        exp: data.exp_gained,
        total: data.new_total_exp,
        distance: Math.round(data.distance_meters || 0)
      });
      setGeoStatus('ok');
      setPhoto(null);
      setPhotoFile(null);
      fetchToday();

      // Confetti effect
      if (typeof document !== 'undefined') {
        for (let i = 0; i < 30; i++) {
          setTimeout(() => createConfetti(), i * 30);
        }
      }

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
      setGeoStatus('fail');
    } finally {
      setAction(null);
    }
  };

  const createConfetti = () => {
    if (typeof document === 'undefined') return;
    const colors = ['#FFD200', '#003F7F', '#00A859', '#FF6B6B', '#4ECDC4'];
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Daily Mission Deploy
        </h1>
        <p className="text-sm text-white/60 mt-1">Check-in & check-out harian dengan GPS + selfie</p>
      </div>

      {/* Status today */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              checkedIn ? 'bg-bpjs-green/20' : 'bg-white/5'
            }`}
          >
            <CheckCircle2 className={`w-5 h-5 ${checkedIn ? 'text-bpjs-green' : 'text-white/40'}`} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Check-In Hari Ini</div>
            <div className="text-xs text-white/50">
              {checkedIn
                ? `✓ Sudah check-in ${new Date(todayAtt.find((a) => a.type === 'Check-In')?.timestamp || '').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                : 'Belum check-in'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              checkedOut ? 'bg-bpjs-green/20' : 'bg-white/5'
            }`}
          >
            <CheckCircle2 className={`w-5 h-5 ${checkedOut ? 'text-bpjs-green' : 'text-white/40'}`} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Check-Out Hari Ini</div>
            <div className="text-xs text-white/50">
              {checkedOut
                ? `✓ Sudah check-out ${new Date(todayAtt.find((a) => a.type === 'Check-Out')?.timestamp || '').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                : 'Belum check-out'}
            </div>
          </div>
        </div>
      </div>

      {/* Selfie Preview */}
      {photo && (
        <div className="glass-card p-4">
          <div className="text-sm font-medium text-white mb-2">Foto Selfie:</div>
          <div className="relative">
            <img src={photo} alt="Selfie" className="w-full rounded-lg max-h-72 object-cover" />
            <button
              onClick={() => {
                setPhoto(null);
                setPhotoFile(null);
              }}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Photo input (hidden, fallback only) */}

      {/* Camera Modal — kamera depan live */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          {/* Header */}
          <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between">
            <div className="text-white">
              <p className="font-semibold text-sm">Kamera Depan (Selfie)</p>
              <p className="text-xs text-white/60">Posisikan wajah di tengah, lalu klik Capture</p>
            </div>
            <button
              onClick={closeCamera}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video preview */}
          <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-2xl overflow-hidden">
            {/* Selalu render video element supaya ref tidak null */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Overlay: loading saat starting */}
            {cameraStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                <Loader2 className="w-10 h-10 text-bpjs-yellow animate-spin mb-2" />
                <p className="text-white/70 text-sm">Memulai kamera...</p>
              </div>
            )}

            {/* Overlay: error */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black">
                <CameraOff className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-white font-medium mb-2">Kamera Tidak Tersedia</p>
                <p className="text-white/60 text-xs mb-4">{cameraError}</p>
                <div className="flex gap-2">
                  <button
                    onClick={closeCamera}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg"
                  >
                    Tutup
                  </button>
                  <label className="px-4 py-2 bg-bpjs-yellow text-bpjs-blue-dark text-sm font-semibold rounded-lg cursor-pointer hover:bg-bpjs-yellow-dark">
                    <Camera className="w-4 h-4 inline mr-1" /> Upload dari File
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPhotoFile(file);
                        const reader = new FileReader();
                        reader.onload = () => setPhoto(reader.result as string);
                        reader.readAsDataURL(file);
                        closeCamera();
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Canvas (hidden, untuk capture) */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Capture button */}
          {!cameraStarting && !cameraError && (
            <button
              onClick={capturePhoto}
              className="mt-6 flex items-center gap-2 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark font-bold px-8 py-3 rounded-full shadow-lg pulse-glow"
            >
              <Camera className="w-5 h-5" />
              CAPTURE
            </button>
          )}

          {/* Hint */}
          {!cameraStarting && !cameraError && (
            <p className="mt-3 text-white/50 text-xs text-center max-w-xs">
              💡 Kamera depan aktif. Pastikan wajah terlihat jelas dan pencahayaan cukup.
            </p>
          )}
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="glass-card p-4 bg-red-500/10 border-red-400/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-200 font-medium text-sm">Gagal</p>
            <p className="text-red-300/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="glass-card p-5 bg-bpjs-green/10 border-bpjs-green/40 text-center">
          <CheckCircle2 className="w-14 h-14 text-bpjs-green mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white">Mission Berhasil!</h3>
          <p className="text-sm text-white/60 mt-1">Jarak dari kantor: {success.distance}m</p>
          <div className="mt-3 inline-flex items-center gap-1 bg-bpjs-yellow text-bpjs-blue-dark px-4 py-1.5 rounded-full font-bold">
            <Zap className="w-4 h-4" /> +{success.exp} EXP
          </div>
          <p className="text-xs text-white/50 mt-2">Total EXP: {success.total}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {/* GPS Status indicator */}
        {action && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            geoStatus === 'checking' ? 'bg-bpjs-blue/20 text-bpjs-yellow' :
            geoStatus === 'ok' ? 'bg-bpjs-green/20 text-bpjs-green' :
            geoStatus === 'fail' ? 'bg-red-500/20 text-red-300' :
            'bg-white/5 text-white/60'
          }`}>
            {geoStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
            {geoStatus === 'checking' && <span>Mencari sinyal GPS... Pastikan Anda di dalam radius kantor BPJS. Bisa makan 10-30 detik.</span>}
            {geoStatus === 'ok' && <CheckCircle2 className="w-4 h-4" />}
            {geoStatus === 'ok' && <span>GPS terkunci! Mengirim data...</span>}
            {geoStatus === 'fail' && <AlertTriangle className="w-4 h-4" />}
            {geoStatus === 'fail' && <span>Gagal. Coba lagi atau cek izin lokasi di browser.</span>}
          </div>
        )}
        {!checkedIn && (
          <button
            onClick={() => handleAction('check-in')}
            disabled={action !== null}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-bpjs-yellow to-amber-500 hover:from-amber-400 hover:to-amber-600 text-bpjs-blue-dark font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 pulse-glow"
          >
            {action === 'check-in' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <MapPin className="w-6 h-6" />
                DEPLOY MISSION (CHECK-IN)
              </>
            )}
          </button>
        )}

        {checkedIn && !checkedOut && (
          <button
            onClick={() => handleAction('check-out')}
            disabled={action !== null}
            className="w-full flex items-center justify-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
          >
            {action === 'check-out' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                CHECK-OUT
              </>
            )}
          </button>
        )}

        {!photo && !checkedIn && (
          <button
            onClick={openCamera}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl"
          >
            <Camera className="w-5 h-5" /> Ambil Foto Selfie Dulu
          </button>
        )}

        {checkedIn && checkedOut && (
          <div className="glass-card p-5 text-center">
            <CheckCircle2 className="w-12 h-12 text-bpjs-green mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">Hari Ini Selesai!</h3>
            <p className="text-sm text-white/60 mt-1">Kembali besok untuk check-in lagi.</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="glass-card p-4 text-xs text-white/60 space-y-1">
        <div className="flex items-center gap-2">
          <Navigation className="w-3 h-3" />
          <span>Sistem akan memvalidasi posisi GPS Anda (radius 150m dari kantor)</span>
        </div>
        <div className="flex items-center gap-2">
          <Camera className="w-3 h-3" />
          <span>Foto selfie wajib untuk check-in (gunakan kamera depan)</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3" />
          <span>+20 EXP check-in, +10 EXP check-out</span>
        </div>
      </div>

      {/* History today */}
      {loading && todayAtt.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-bpjs-yellow" />
        </div>
      ) : (
        todayAtt.length > 0 && (
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Riwayat Hari Ini</h3>
            <div className="space-y-2">
              {todayAtt.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/80">
                    {a.type === 'Check-In' ? '📍 Masuk' : '🏠 Keluar'}
                  </span>
                  <span className="text-white/60">
                    {new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    {a.distance_meters !== null && ` • ${Math.round(a.distance_meters)}m`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Warning: hari libur/weekend — check-in butuh approval pembina */}
      <HolidayWarning />

      {/* Today's leave status (if approved) */}
      {todayLeave && (
        <div className="glass-card p-4 bg-bpjs-green/10 border-bpjs-green/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bpjs-green/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-bpjs-green" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Hari ini: {todayLeave.type === 'sakit' ? 'Sakit' : todayLeave.type === 'izin' ? 'Izin' : todayLeave.type === 'cuti' ? 'Cuti' : 'Dinas Luar'} (Approved)
              </p>
              <p className="text-xs text-white/60">
                {todayLeave.start_date === todayLeave.end_date
                  ? new Date(todayLeave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
                  : `${new Date(todayLeave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(todayLeave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                }
                {' • '}Streak Anda tidak terputus.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leave request section */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-bpjs-yellow" />
            <h3 className="text-sm font-semibold text-white">Pengajuan Izin/Sakit</h3>
          </div>
          {!todayLeave && !showLeaveForm && (
            <button
              onClick={() => setShowLeaveForm(true)}
              className="text-xs bg-bpjs-yellow/10 hover:bg-bpjs-yellow/20 border border-bpjs-yellow/30 text-bpjs-yellow font-medium px-3 py-1.5 rounded-lg"
            >
              + Ajukan Izin
            </button>
          )}
        </div>

        {/* Leave form */}
        {showLeaveForm && (
          <LeaveForm
            onClose={() => setShowLeaveForm(false)}
            onSuccess={() => {
              setShowLeaveForm(false);
              fetchToday();
            }}
          />
        )}

        {/* Leave history */}
        {!showLeaveForm && myLeaves.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {myLeaves.slice(0, 5).map((lr) => (
              <div key={lr.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    lr.type === 'sakit' ? 'bg-red-500/20 text-red-300' :
                    lr.type === 'izin' ? 'bg-amber-500/20 text-amber-300' :
                    lr.type === 'cuti' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-purple-500/20 text-purple-300'
                  }`}>
                    {lr.type === 'sakit' ? 'Sakit' : lr.type === 'izin' ? 'Izin' : lr.type === 'cuti' ? 'Cuti' : 'Dinas Luar'}
                  </span>
                  <span className="text-white/60">
                    {lr.start_date === lr.end_date
                      ? new Date(lr.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                      : `${new Date(lr.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(lr.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                    }
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  lr.status === 'approved' ? 'bg-bpjs-green/20 text-bpjs-green' :
                  lr.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                  'bg-amber-500/20 text-amber-300'
                }`}>
                  {lr.status === 'approved' ? '✓ Approved' : lr.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                </span>
              </div>
            ))}
          </div>
        )}

        {!showLeaveForm && myLeaves.length === 0 && !todayLeave && (
          <p className="text-xs text-white/40 text-center py-2">
            Belum ada pengajuan izin. Klik "+ Ajukan Izin" jika sakit/ada keperluan.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LeaveForm component — form pengajuan izin/sakit/cuti/dinas-luar
// ============================================================
function LeaveForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    type: 'izin' as 'sakit' | 'izin' | 'cuti' | 'dinas-luar',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
    medical_certificate_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUploadMedical = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('medical', file);
      const res = await fetch('/api/leave/upload-medical', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ ...form, medical_certificate_url: data.url });
    } catch (e: any) {
      setError('Upload gagal: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leave/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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

  const diffDays = Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24));
  const uploadLabel = form.type === 'sakit' ? 'Surat Dokter' : form.type === 'dinas-luar' ? 'Surat Tugas / Bukti Dinas' : 'Surat Izin / Bukti';
  const uploadOptional = form.type !== 'sakit' || diffDays === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-3 p-3 bg-white/5 rounded-lg">
      <div>
        <label className="block text-xs font-medium text-white/80 mb-1">Tipe *</label>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { value: 'sakit', label: '🏥 Sakit', color: 'red' },
            { value: 'izin', label: '📋 Izin', color: 'amber' },
            { value: 'cuti', label: '🏖️ Cuti', color: 'blue' },
            { value: 'dinas-luar', label: '🚗 Dinas Luar', color: 'purple' }
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm({ ...form, type: opt.value })}
              className={`p-2 rounded-lg text-xs font-medium transition-all ${
                form.type === opt.value
                  ? 'bg-bpjs-yellow text-bpjs-blue-dark'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-white/80 mb-1">Tanggal Mulai *</label>
          <input
            type="date"
            required
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/80 mb-1">Tanggal Selesai *</label>
          <input
            type="date"
            required
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/80 mb-1">Alasan *</label>
        <textarea
          required
          rows={2}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
          placeholder={form.type === 'sakit' ? 'Demam, flu, harus istirahat...' : form.type === 'dinas-luar' ? 'Didiajak dinas ke kantor cabang lain...' : 'Urus KTP, keluarga sakit...'}
        />
      </div>

      {uploadOptional ? (
        <div>
          <label className="block text-xs font-medium text-white/80 mb-1">
            {uploadLabel} (opsional)
          </label>
          {form.medical_certificate_url ? (
            <div className="flex items-center gap-2 text-xs text-bpjs-green">
              <CheckCircle2 className="w-4 h-4" />
              <span>{uploadLabel} sudah diupload</span>
              <button type="button" onClick={() => setForm({ ...form, medical_certificate_url: '' })} className="text-red-400 hover:underline">
                Hapus
              </button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              Upload {uploadLabel}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadMedical(e.target.files[0])}
              />
            </label>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-white/80 mb-1">
            {uploadLabel} * (wajib untuk sakit &gt;1 hari)
          </label>
          {form.medical_certificate_url ? (
            <div className="flex items-center gap-2 text-xs text-bpjs-green">
              <CheckCircle2 className="w-4 h-4" />
              <span>{uploadLabel} sudah diupload</span>
              <button type="button" onClick={() => setForm({ ...form, medical_certificate_url: '' })} className="text-red-400 hover:underline">
                Hapus
              </button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              Upload {uploadLabel}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadMedical(e.target.files[0])}
              />
            </label>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-3 py-1.5 border border-white/10 text-white/70 text-xs font-medium rounded-lg hover:bg-white/5"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-3 py-1.5 bg-bpjs-yellow text-bpjs-blue-dark text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Ajukan
        </button>
      </div>
    </form>
  );
}

// ============================================================
// HolidayWarning — Warning hari libur/weekend di halaman check-in
// ============================================================
function HolidayWarning() {
  const [holiday, setHoliday] = useState<{ name: string; type: string } | null>(null);
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Minggu, 6=Sabtu
    if (day === 0 || day === 6) {
      setIsWeekend(true);
    }
    // Fetch holidays
    fetch('/api/holidays')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const today = now.toISOString().split('T')[0];
          const found = (d.holidays || []).find((h: any) => h.date === today);
          if (found) setHoliday({ name: found.name, type: found.type });
        }
      })
      .catch(() => {});
  }, []);

  if (!isWeekend && !holiday) return null;

  const reason = holiday ? `Hari libur: ${holiday.name}` : 'Weekend (Sabtu/Minggu)';

  return (
    <div className="glass-card p-4 bg-amber-500/10 border-amber-500/30 border">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-300">
            ⚠️ Hari ini {reason}
          </p>
          <p className="text-xs text-white/70 mt-0.5">
            Check-in/out Anda di hari ini akan <span className="font-semibold text-amber-300">menunggu persetujuan pembina</span> sebelum EXP diberikan.
            Pastikan Anda benar-benar ditugaskan oleh pembina untuk masuk di hari ini.
          </p>
        </div>
      </div>
    </div>
  );
}
