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

    // 1. 決済ステータスを最終確認
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('status, id')
      .eq('email', email)
      .single();

    if (profileError || !profile || profile.status !== 'active') {
      console.error('❌ 決済未完了エラー:', profileError || `status is ${profile?.status}`);
      return NextResponse.json({ 
        error: '決済が完了していないか、有効なユーザーではありません。' 
      }, { status: 403 });
    }

    console.log('✅ ステータス確認完了(active). Authユーザーを作成します...');

    // 2. Authユーザーを作成（管理者権限で実行）
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // 決済済みなのでメール確認をスキップ
    });

    if (authError) {
      // ここでエラーが出る主な原因: すでに同じメールアドレスのユーザーが存在する
      console.error('❌ Authユーザー作成失敗:', JSON.stringify(authError, null, 2));
      return NextResponse.json({ 
        error: `Database error creating new user: ${authError.message}` 
      }, { status: 500 });
    }

    console.log(`✅ Authユーザー作成成功: ${authUser.user.id}`);

    // 3. ProfilesテーブルのIDを、新しく作成されたAuthユーザーのIDで更新
    // これを行わないと、ログイン後に自分のプロフィールを取得できません
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ id: authUser.user.id })
      .eq('email', email);

    if (updateError) {
      console.error('❌ ProfilesのID更新失敗:', JSON.stringify(updateError, null, 2));
      // Authユーザーは既に作成されているため、ここでは500を返さずログに留めます
    } else {
      console.log('✅ ProfilesテーブルのID同期完了');
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error('❌ 重大なシステムエラー:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}