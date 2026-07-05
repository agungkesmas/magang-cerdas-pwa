// ============================================================
// /api/leave/submit — Intern ajukan izin/sakit/cuti/dinas-luar
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { LeaveType } from '@/types';

const VALID_TYPES: LeaveType[] = ['sakit', 'izin', 'cuti', 'dinas-luar'];

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, start_date, end_date, reason, medical_certificate_url } = await req.json();

    // Validation
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Tipe izin tidak valid' }, { status: 400 });
    }
    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Tanggal mulai dan selesai wajib diisi' }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Alasan wajib diisi' }, { status: 400 });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }, { status: 400 });
    }

    // Surat dokter wajib untuk sakit >1 hari
    if (type === 'sakit') {
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && !medical_certificate_url) {
        return NextResponse.json({
          error: 'Surat dokter wajib untuk sakit lebih dari 1 hari'
        }, { status: 400 });
      }
    }

    const supabase = createServerClient();

    // Cek apakah sudah ada pengajuan izin yang pending/approved untuk rentang tanggal yang sama
    const { data: existing } = await supabase
      .from('leave_requests')
      .select('id, type, start_date, end_date, status')
      .eq('intern_id', intern.intern_id)
      .in('status', ['pending', 'approved'])
      .lte('start_date', end_date)
      .gte('end_date', start_date)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: `Anda sudah punya pengajuan ${existing.type} (${existing.status}) yang tumpang tindih dengan tanggal ini`
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        intern_id: intern.intern_id,
        type,
        start_date,
        end_date,
        reason: reason.trim(),
        medical_certificate_url: medical_certificate_url || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, leave_request: data });
  } catch (e: any) {
    console.error('[leave/submit] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
