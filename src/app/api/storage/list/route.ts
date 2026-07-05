// ============================================================
// /api/storage/list — List files in a bucket for backup & clean
// GET ?bucket=attendance-photos&older_than_days=30
// Returns: { files: [{ url, name, size, created_at, metadata }] }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get('bucket') || 'attendance-photos';
    const olderThanDays = parseInt(searchParams.get('older_than_days') || '0', 10);

    if (!['attendance-photos', 'chat-attachments'].includes(bucket)) {
      return NextResponse.json({ error: 'Bucket tidak valid' }, { status: 400 });
    }

    const supabase = createServerClient();

    // List all files in bucket
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Filter by age if older_than_days > 0
    const cutoffDate = olderThanDays > 0
      ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
      : null;

    const fileList: any[] = [];
    let totalSize = 0;

    for (const file of files || []) {
      // Skip folders (directories have metadata === null and no id)
      if (!file.id) continue;

      const createdAt = file.created_at ? new Date(file.created_at) : new Date(0);
      if (cutoffDate && createdAt > cutoffDate) continue;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(file.name);
      const size = file.metadata?.size || 0;
      totalSize += size;

      fileList.push({
        name: file.name,
        url: urlData.publicUrl,
        size: size,
        created_at: file.created_at || null,
        bucket
      });
    }

    return NextResponse.json({
      success: true,
      bucket,
      files: fileList,
      total_count: fileList.length,
      total_size: totalSize,
      total_size_mb: Math.round((totalSize / 1024 / 1024) * 100) / 100
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
