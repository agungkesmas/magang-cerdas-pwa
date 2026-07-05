// ============================================================
// /api/chat/send — Kirim pesan ke grup (text, image, atau document)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getInternToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    const intern = await getInternToken();
    if (!admin && !pembina && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { group_id, content, attachment_url, attachment_type, attachment_filename } = await req.json();
    if (!group_id) return NextResponse.json({ error: 'group_id wajib diisi' }, { status: 400 });

    // Either content or attachment must be present
    const hasContent = content?.trim() && content.length > 0;
    const hasAttachment = attachment_url && attachment_type;
    if (!hasContent && !hasAttachment) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }
    if (hasContent && content.length > 2000) {
      return NextResponse.json({ error: 'Pesan terlalu panjang (maks 2000 karakter)' }, { status: 400 });
    }

    // Determine sender
    let senderType: string;
    let senderId: string;
    let senderName: string;
    if (admin) {
      senderType = 'admin';
      senderId = admin.sub;
      senderName = admin.name;
    } else if (pembina) {
      senderType = 'pembina';
      senderId = pembina.pembina_id;
      senderName = pembina.name;
    } else {
      senderType = 'peserta';
      senderId = intern!.intern_id;
      senderName = intern!.name;
    }

    const supabase = createServerClient();

    // Verify membership (admin bebas, lainnya harus member)
    if (!admin) {
      const userType = pembina ? 'pembina' : 'peserta';
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', group_id)
        .eq('user_type', userType)
        .eq('user_id', senderId)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    // Determine message_type
    let messageType = 'text';
    if (hasAttachment) {
      messageType = attachment_type === 'image' ? 'image' : 'document';
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        group_id,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message_type: messageType,
        content: hasContent ? content.trim() : null,
        attachment_url: hasAttachment ? attachment_url : null,
        attachment_type: hasAttachment ? attachment_type : null,
        attachment_filename: hasAttachment ? attachment_filename : null
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
