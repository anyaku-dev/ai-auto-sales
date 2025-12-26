import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. 決済ステータスを最終確認
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('email', email)
      .single();

    if (profileError || !profile || profile.status !== 'active') {
      return NextResponse.json({ error: '決済が完了していないか、有効なユーザーではありません。' }, { status: 403 });
    }

    // 2. Authユーザーを作成（管理者権限で実行）
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // 決済済みなのでメール確認をスキップ
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}