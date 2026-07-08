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

    for (const [internId, atts] of Object.entries(byIntern)) {
      if (atts.length < 3) continue;
      const intern = atts[0].interns;

      // ============================================================
      // Pattern 1: GPS distance sama persis (beda <2m) ≥3 hari
      // ============================================================
      const distGroups: Record<string, any[]> = {};
      atts.forEach((a) => {
        if (a.distance_meters === null) return;
        // Round to nearest 5m for grouping
        const bucket = Math.round(a.distance_meters / 5) * 5;
        if (!distGroups[bucket]) distGroups[bucket] = [];
        distGroups[bucket].push(a);
      });

      for (const [bucket, group] of Object.entries(distGroups)) {
        if (group.length >= 3) {
          patterns.push({
            intern_id: internId,
            intern_name: intern.name,
            pattern_type: 'gps_distance_consistent',
            description: `Jarak GPS konsisten ~${bucket}m di ${group.length} check-in. Mungkin fake GPS atau foto dari spot yang sama persis.`,
            affected_attendance_ids: group.map((g) => g.id),
            severity: group.length >= 5 ? 'high' : 'medium'
          });
        }
      }

      // ============================================================
      // Pattern 2: Timestamp check-in identik (jam:menit sama) ≥3 hari
      // ============================================================
      const timeGroups: Record<string, any[]> = {};
      atts.forEach((a) => {
        const ts = new Date(a.timestamp);
        const timeKey = `${ts.getHours()}:${ts.getMinutes().toString().padStart(2, '0')}`;
        if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
        timeGroups[timeKey].push(a);
      });

      for (const [timeKey, group] of Object.entries(timeGroups)) {
        if (group.length >= 3) {
          patterns.push({
            intern_id: internId,
            intern_name: intern.name,
            pattern_type: 'timestamp_consistent',
            description: `Check-in selalu jam ${timeKey} di ${group.length} hari. Mungkin automated script atau polai tidak natural.`,
            affected_attendance_ids: group.map((g) => g.id),
            severity: group.length >= 5 ? 'high' : 'medium'
          });
        }
      }

      // ============================================================
      // Pattern 3: Jarak GPS tepat di boundary (mis. 195-200m dari 200m radius)
      // ============================================================
      const boundaryAtts = atts.filter((a) => {
        if (a.distance_meters === null) return false;
        // Dalam 5m dari boundary 200m
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
