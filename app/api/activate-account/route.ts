import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log(`🚀 アカウント有効化リクエスト開始: ${email}`);

    // 1. まず profiles テーブルに決済済みのデータがあるか確認
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('email', email)
      .single();

    if (profileError || !profile || profile.status !== 'active') {
      console.error('❌ 決済未完了:', profileError || 'status not active');
      return NextResponse.json({ error: '決済が確認できません。' }, { status: 403 });
    }

    // 2. Authユーザーを作成
    // ここで一旦 profiles との自動連携による衝突を避けるため、createUserを実行
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Auth作成失敗:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 3. 決済情報（profiles）を、作成された本物のAuth IDに紐付ける
    // これが「既存の行を上書き更新」する形になるので、エラーを回避できます
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        id: authUser.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) {
      console.error('❌ profilesのID同期失敗:', updateError.message);
    }

    console.log(`✅ アカウント有効化完了: ${email}`);
    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error('❌ システムエラー:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}