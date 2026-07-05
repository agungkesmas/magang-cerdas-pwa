// ============================================================
// /api/storage/clean — Hapus file dari bucket + update DB
// POST { bucket, older_than_days }
// Manual trigger only — tidak ada auto/cron
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bucket, older_than_days } = await req.json();
    if (!bucket || !['attendance-photos', 'chat-attachments'].includes(bucket)) {
      return NextResponse.json({ error: 'Bucket tidak valid' }, { status: 400 });
    }

    const days = parseInt(older_than_days, 10) || 0;
    const supabase = createServerClient();

    // 1. List all files to delete
    const { data: files, error: listErr } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } });

    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

    const cutoffDate = days > 0
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      : null;

    const fileNamesToDelete: string[] = [];
    let totalSize = 0;

    for (const file of files || []) {
      if (!file.id) continue;
      const createdAt = file.created_at ? new Date(file.created_at) : new Date(0);
      if (cutoffDate && createdAt > cutoffDate) continue;
      fileNamesToDelete.push(file.name);
      totalSize += file.metadata?.size || 0;
    }

    if (fileNamesToDelete.length === 0) {
      return NextResponse.json({ success: true, deleted_count: 0, message: 'Tidak ada file untuk dihapus' });
    }

    // 2. Delete files from storage (batch, max 1000 per request)
    const { error: delErr } = await supabase.storage
      .from(bucket)
      .remove(fileNamesToDelete);

    if (delErr) {
      console.error('[storage/clean] delete error:', delErr);
      return NextResponse.json({ error: 'Gagal hapus file: ' + delErr.message }, { status: 500 });
    }

    // 3. Update DB — set photo_url = NULL for attendance
    if (bucket === 'attendance-photos') {
      // Get the public URL prefix for this bucket
      const urlPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attendance-photos/`;
      // Update attendance records where photo_url contains the deleted files
      const deletedUrls = fileNamesToDelete.map((name) => `${urlPrefix}${name}`);
      await supabase
        .from('attendance')
        .update({ photo_url: null })
        .in('photo_url', deletedUrls);
    }

    // 4. Update DB — set attachment fields = NULL for chat messages
    if (bucket === 'chat-attachments') {
      const urlPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/`;
      const deletedUrls = fileNamesToDelete.map((name) => `${urlPrefix}${name}`);
      await supabase
        .from('chat_messages')
        .update({
          attachment_url: null,
          attachment_type: null,
          attachment_filename: null,
          message_type: 'text'
        })
        .in('attachment_url', deletedUrls);
    }

    return NextResponse.json({
      success: true,
      deleted_count: fileNamesToDelete.length,
      freed_size_mb: Math.round((totalSize / 1024 / 1024) * 100) / 100,
      message: `${fileNamesToDelete.length} file berhasil dihapus`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
