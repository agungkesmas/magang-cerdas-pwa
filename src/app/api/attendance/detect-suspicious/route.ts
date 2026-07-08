// ============================================================
// /api/attendance/detect-suspicious — Auto-detect pattern mencurigakan
//
// Logic deteksi (TANPA face recognition, gratis):
// 1. GPS distance sama persis (atau beda <2m) ≥3 hari berturut
//    → kemungkinan fake GPS atau foto dari tempat yang sama persis
// 2. Timestamp check-in identik (jam:menit:detik sama) ≥3 hari
//    → kemungkinan automated script
// 3. Foto hash sama (ada di cache client) — skip, terlalu kompleks
// 4. Jarak GPS TEPAT di radius boundary (mis. 199m dari 200m radius)
//    ≥3 hari → kemungkinan nyoba boundary
//
// Return: list pattern mencurigakan yang terdeteksi
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

interface SuspiciousPattern {
  intern_id: string;
  intern_name: string;
  pattern_type: string;
  description: string;
  affected_attendance_ids: string[];
  severity: 'medium' | 'high';
}

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Ambil semua attendance 14 hari terakhir dengan intern info
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: records, error } = await supabase
      .from('attendance')
      .select(`
        id,
        intern_id,
        type,
        timestamp,
        distance_meters,
        is_within_geofence,
        is_suspicious,
        auto_flag_reason,
        is_late,
        is_early,
        interns!inner(name, department)
      `)
      .eq('type', 'Check-In')
      .gte('timestamp', fourteenDaysAgo.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by intern
    const byIntern: Record<string, any[]> = {};
    (records || []).forEach((r: any) => {
      if (!byIntern[r.intern_id]) byIntern[r.intern_id] = [];
      byIntern[r.intern_id].push(r);
    });

    const patterns: SuspiciousPattern[] = [];

    // ============================================================
    // Pattern 6 FIRST: Cek peserta aktif yang TIDAK PUNYA record sama sekali
    // (mereka tidak akan muncul di byIntern)
    // ============================================================
    const { data: activeInterns } = await supabase
      .from('interns')
      .select('id, name, department')
      .eq('is_active', true);

    (activeInterns || []).forEach((intern: any) => {
      if (!byIntern[intern.id]) {
        // Peserta aktif tapi 0 check-in dalam 14 hari
        patterns.push({
          intern_id: intern.id,
          intern_name: intern.name,
          pattern_type: 'no_attendance_14days',
          description: `Tidak ada check-in sama sekali dalam 14 hari terakhir. Peserta mungkin tidak aktif magang atau bermasalah.`,
          affected_attendance_ids: [],
          severity: 'high'
        });
      }
    });

    for (const [internId, atts] of Object.entries(byIntern)) {
      if (atts.length < 3) continue;
      const intern = atts[0].interns;

      // ============================================================
      // Pattern 1: GPS distance sama persis (beda <2m) ≥5 hari
      // Threshold dinaikkan dari 3 ke 5 untuk reduce false positive
      // (8 peserta di kantor yang sama wajar punya jarak mirip)
      // ============================================================
      const distGroups: Record<string, any[]> = {};
      atts.forEach((a) => {
        if (a.distance_meters === null) return;
        // Round to nearest 10m for grouping (wider bucket = less false positive)
        const bucket = Math.round(a.distance_meters / 10) * 10;
        if (!distGroups[bucket]) distGroups[bucket] = [];
        distGroups[bucket].push(a);
      });

      for (const [bucket, group] of Object.entries(distGroups)) {
        if (group.length >= 5) {
          patterns.push({
            intern_id: internId,
            intern_name: intern.name,
            pattern_type: 'gps_distance_consistent',
            description: `Jarak GPS konsisten ~${bucket}m di ${group.length} check-in. Mungkin fake GPS atau foto dari spot yang sama persis.`,
            affected_attendance_ids: group.map((g) => g.id),
            severity: group.length >= 7 ? 'high' : 'medium'
          });
        }
      }

      // ============================================================
      // Pattern 2: Timestamp check-in identik (jam:menit sama) ≥5 hari
      // Pakai WIB timezone (bukan UTC) + 15-min bucket untuk reduce noise
      // ============================================================
      const timeGroups: Record<string, any[]> = {};
      atts.forEach((a) => {
        // PAKAI WIB TIMEZONE — bukan getHours() yang return UTC
        const wibTime = new Date(a.timestamp).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        // Bucket per 15 menit (mis. "07:00", "07:15", "07:30", "07:45")
        const [hh, mm] = wibTime.split(':');
        const bucket = Math.floor(parseInt(mm) / 15) * 15;
        const timeKey = `${hh}:${bucket.toString().padStart(2, '0')}`;
        if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
        timeGroups[timeKey].push(a);
      });

      for (const [timeKey, group] of Object.entries(timeGroups)) {
        if (group.length >= 5) {
          patterns.push({
            intern_id: internId,
            intern_name: intern.name,
            pattern_type: 'timestamp_consistent',
            description: `Check-in selalu di sekitar jam ${timeKey} WIB di ${group.length} hari. Mungkin automated script atau polai tidak natural.`,
            affected_attendance_ids: group.map((g) => g.id),
            severity: group.length >= 7 ? 'high' : 'medium'
          });
        }
      }

      // ============================================================
      // Pattern 3: Jarak GPS tepat di boundary (mis. 195-200m dari 200m radius)
      // ============================================================
      const boundaryAtts = atts.filter((a) => {
        if (a.distance_meters === null) return false;
        return a.distance_meters >= 195 && a.distance_meters <= 200;
      });
      if (boundaryAtts.length >= 2) {
        patterns.push({
          intern_id: internId,
          intern_name: intern.name,
          pattern_type: 'gps_boundary_edge',
          description: `${boundaryAtts.length} check-in di tepi geofence (195-200m). Mungkin nyoba boundary.`,
          affected_attendance_ids: boundaryAtts.map((g) => g.id),
          severity: 'medium'
        });
      }

      // ============================================================
      // Pattern 4: Sering terlambat (is_late=true ≥3x dalam 14 hari)
      // ============================================================
      const lateAtts = atts.filter((a: any) => a.is_late === true);
      if (lateAtts.length >= 3) {
        // Ambil jam-jam terlambat untuk info
        const lateTimes = lateAtts.map((a: any) => {
          const wibTime = new Date(a.timestamp).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          return wibTime;
        });
        patterns.push({
          intern_id: internId,
          intern_name: intern.name,
          pattern_type: 'frequent_late',
          description: `Sering terlambat check-in: ${lateAtts.length}x dalam 14 hari terakhir. Jam terlambat: ${lateTimes.join(', ')}. Patut diberi peringatan edukasi.`,
          affected_attendance_ids: lateAtts.map((g: any) => g.id),
          severity: lateAtts.length >= 5 ? 'high' : 'medium'
        });
      }

      // ============================================================
      // Pattern 5: Sering lupa absen pulang (check-in tanpa check-out ≥3x)
      // ============================================================
      // Cek dari records: cari tanggal yang ada Check-In tapi tidak ada Check-Out
      const ciDates = new Set<string>();
      const coDates = new Set<string>();
      atts.forEach((a: any) => {
        const dStr = new Date(a.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        if (a.type === 'Check-In') ciDates.add(dStr);
        // Untuk check-out, perlu fetch terpisah karena query hanya Check-In
      });

      // Fetch check-out records untuk intern ini (14 hari terakhir)
      const { data: coRecords } = await supabase
        .from('attendance')
        .select('id, timestamp')
        .eq('intern_id', internId)
        .eq('type', 'Check-Out')
        .gte('timestamp', fourteenDaysAgo.toISOString());

      (coRecords || []).forEach((co: any) => {
        const dStr = new Date(co.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        coDates.add(dStr);
      });

      const forgotCheckoutDates: string[] = [];
      ciDates.forEach(d => {
        if (!coDates.has(d)) forgotCheckoutDates.push(d);
      });

      if (forgotCheckoutDates.length >= 3) {
        patterns.push({
          intern_id: internId,
          intern_name: intern.name,
          pattern_type: 'frequent_missing_checkout',
          description: `Sering lupa absen pulang: ${forgotCheckoutDates.length}x dalam 14 hari terakhir (tanggal: ${forgotCheckoutDates.slice(0, 5).join(', ')}${forgotCheckoutDates.length > 5 ? '...' : ''}). Perlu edukasi disiplin absen.`,
          affected_attendance_ids: [],
          severity: forgotCheckoutDates.length >= 5 ? 'high' : 'medium'
        });
      }
    }

    return NextResponse.json({
      success: true,
      patterns,
      total: patterns.length,
      high_severity: patterns.filter((p) => p.severity === 'high').length,
      scanned_records: records?.length || 0,
      scanned_interns: Object.keys(byIntern).length
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
