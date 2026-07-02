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
  CameraOff
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

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/list?limit=10');
      const data = await res.json();
      if (data.success) {
        const today = new Date().toISOString().split('T')[0];
        setTodayAtt(
          (data.attendance || []).filter((a: any) => a.timestamp?.startsWith(today))
        );
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
        reject(new Error('Geolocation tidak didukung browser ini'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message || 'Gagal mendapatkan lokasi')),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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

      // tunggu video element ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraStarting(false);
      }, 200);
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

    // Set canvas size = video size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Mirror horizontal (karena kamera depan biasanya mirror)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert ke blob
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
      0.85
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
        const fd = new FormData();
        fd.append('photo', photoFile);
        const upRes = await fetch('/api/upload/attendance-photo', { method: 'POST', body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Upload foto gagal');
        photoUrl = upData.url;
      }

      // 4. Submit check-in/out
      const endpoint = type === 'check-in' ? '/api/attendance/check-in' : '/api/attendance/check-out';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, photo_url: photoUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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
            {cameraStarting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-bpjs-yellow animate-spin mb-2" />
                <p className="text-white/70 text-sm">Memulai kamera...</p>
              </div>
            ) : cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <CameraOff className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-white font-medium mb-2">Kamera Tidak Tersedia</p>
                <p className="text-white/60 text-xs mb-4">{cameraError}</p>
                <button
                  onClick={closeCamera}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
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
    </div>
  );
}
