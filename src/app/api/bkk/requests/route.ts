// ============================================================
// /api/bkk/requests — BKK teacher: list & create internship requests
// GET  → list all requests by this teacher
// POST → create new request (status: 'submitted')
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';

export async function GET() {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('internship_requests')
      .select(`
        id,
        school_name,
        request_title,
        contact_person,
        contact_phone,
        contact_email,
        requested_slots,
        proposed_start_date,
        proposed_end_date,
        requested_majors,
        requested_departments,
        cover_letter,
        additional_notes,
        attachment_url,
        student_list_url,
        status,
        review_notes,
        accepted_slots,
        actual_start_date,
        actual_end_date,
        assigned_departments,
        reviewed_at,
        created_at,
        updated_at
      `)
      .eq('bkk_teacher_id', teacher.teacher_id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, requests: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Validate required fields — sederhana: judul + slots + surat
    if (!body.request_title?.trim()) {
      return NextResponse.json({ error: 'Judul permintaan wajib diisi' }, { status: 400 });
    }
    if (!body.requested_slots || body.requested_slots < 1 || body.requested_slots > 100) {
      return NextResponse.json({ error: 'Jumlah peserta harus antara 1-100' }, { status: 400 });
    }
    if (!body.attachment_url?.trim()) {
      return NextResponse.json({ error: 'Surat resmi wajib diupload' }, { status: 400 });
    }

    if (body.proposed_start_date && body.proposed_end_date) {
      if (new Date(body.proposed_end_date) < new Date(body.proposed_start_date)) {
        return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }, { status: 400 });
      }
    }

    const supabase = createServerClient();

    // School name: auto-set dari sekolah BKK (atau dari body kalau >1 sekolah)
    const schoolName = body.school_name?.trim() || (teacher.schools?.length === 1 ? teacher.schools[0] : '');
    if (!schoolName) {
      return NextResponse.json({ error: 'Sekolah wajib diisi' }, { status: 400 });
    }
    const schoolOk = !teacher.schools?.length || teacher.schools.includes(schoolName);
    if (!schoolOk) {
      return NextResponse.json({ error: 'Sekolah yang dipilih tidak terdaftar pada akun BKK Anda' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('internship_requests')
      .insert({
        bkk_teacher_id: teacher.teacher_id,
        school_name: schoolName,
        request_title: body.request_title.trim(),
        contact_person: body.contact_person?.trim() || null,
        contact_phone: body.contact_phone?.trim() || null,
        contact_email: body.contact_email?.trim() || null,
        requested_slots: parseInt(body.requested_slots, 10),
        proposed_start_date: body.proposed_start_date || null,
        proposed_end_date: body.proposed_end_date || null,
        requested_majors: body.requested_majors?.trim() || null,
        requested_departments: body.requested_departments?.trim() || null,
        cover_letter: body.cover_letter?.trim() || null,
        additional_notes: body.additional_notes?.trim() || null,
        attachment_url: body.attachment_url?.trim() || null,
        student_list_url: body.student_list_url?.trim() || null,
        status: 'submitted'
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, request: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
