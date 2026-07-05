// ============================================================
// /api/chat/clear-attachments — Hapus semua file dari chat grup
// - Hapus file fisik dari Supabase Storage
// - Update chat_messages: attachment_url = NULL (pesan tetap ada)
// - Insert system message: "X file dihapus oleh [nama]"
// - Hanya group_admin atau admin yang bisa akses
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { group_id } = await req.json();
    if (!group_id) return NextResponse.json({ error: 'group_id wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    // Verify permission (admin bebas, pembina harus group_admin)
    if (pembina && !admin) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', group_id)
        .eq('user_type', 'pembina')
        .eq('user_id', pembina.pembina_id)
        .maybeSingle();
      if (!membership || membership.role !== 'group_admin') {
        return NextResponse.json({ error: 'Hanya group_admin yang bisa clear file' }, { status: 403 });
      }
    }

    // 1. Fetch all messages with attachments in this group
    const { data: messagesWithAttachments, error: fetchErr } = await supabase
      .from('chat_messages')
      .select('id, attachment_url, attachment_filename')
      .eq('group_id', group_id)
      .not('attachment_url', 'is', null);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    if (!messagesWithAttachments || messagesWithAttachments.length === 0) {
      return NextResponse.json({ success: true, cleared_count: 0, message: 'Tidak ada file untuk dihapus' });
    }

    // 2. Extract file paths from URLs and delete from Storage
    // URL format: https://xxx.supabase.co/storage/v1/object/public/chat-attachments/chat/uuid.ext
    const filePaths = messagesWithAttachments
      .map((m: any) => {
        const url = m.attachment_url;
        if (!url) return null;
        // Extract path after 'chat-attachments/'
        const match = url.match(/chat-attachments\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (filePaths.length > 0) {
      const { error: storageErr } = await supabase
        .storage
        .from('chat-attachments')
        .remove(filePaths as string[]);

      if (storageErr) {
        console.error('[clear-attachments] storage delete error:', storageErr);
        // Continue anyway — still clear DB references even if storage delete fails
      }
    }

    // 3. Update chat_messages: set attachment fields to NULL, keep content
    const messageIds = messagesWithAttachments.map((m: any) => m.id);
    const { error: updateErr } = await supabase
      .from('chat_messages')
      .update({
        attachment_url: null,
        attachment_type: null,
        attachment_filename: null,
        message_type: 'text'
      })
      .in('id', messageIds);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // 4. Insert system message
    const clearerName = admin ? admin.name : pembina!.name;
    const clearerId = admin ? admin.sub : pembina!.pembina_id;
    const clearerType = admin ? 'admin' : 'pembina';

    await supabase.from('chat_messages').insert({
      group_id,
      sender_type: 'system',
      sender_id: clearerId,
      sender_name: 'Sistem',
      message_type: 'system',
      content: `📦 ${clearerName} menghapus ${filePaths.length} file dari grup ini. Pesan chat tetap tersimpan.`
    });

    return NextResponse.json({
      success: true,
      cleared_count: filePaths.length,
      message: `${filePaths.length} file berhasil dihapus`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
