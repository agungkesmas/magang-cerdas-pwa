// ============================================================
// /api/chat/send — Kirim pesan text ke grup
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

    const { group_id, content } = await req.json();
    if (!group_id) return NextResponse.json({ error: 'group_id wajib diisi' }, { status: 400 });
    if (!content?.trim()) return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ error: 'Pesan terlalu panjang (maks 2000 karakter)' }, { status: 400 });

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

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        group_id,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message_type: 'text',
        content: content.trim()
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
