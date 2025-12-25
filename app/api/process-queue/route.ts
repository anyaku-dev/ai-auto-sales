import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercelでの実行設定（タイムアウト等は既存の設定を維持）
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 必要な情報を受け取る
    const { owner_id, target_package_name } = body;

    // バリデーション
    if (!owner_id) {
      return NextResponse.json({ message: '認証エラー: IDが不足しています' }, { status: 400 });
    }

    // 1. 「pending（待機中）」のタスクを1つ探す
    // ※Vercel上ではブラウザを起動せず、対象を見つけるだけに留めます
    let query = supabase.from('targets')
      .select('*')
      .eq('status', 'pending')
      .eq('owner_id', owner_id);

    if (target_package_name) {
        query = query.eq('package_name', target_package_name);
    }
    
    // 古い順（作成順）に1つ取得して、実行順序を守ります
    const { data: target, error } = await query.order('created_at', { ascending: true }).limit(1).single();

    if (error || !target) {
      return NextResponse.json({ message: '送信待機中のリストはありません' });
    }

    // 2. ステータスを「queued（送信指令待ち）」に変更する
    // ★ここが修正のキモです：
    // ブラウザ操作は行わず、ステータスを変えることで、
    // 待機しているPC版の worker.ts に「これ処理して！」と合図を送ります。
    const { error: updateError } = await supabase
      .from('targets')
      .update({ status: 'queued' })
      .eq('id', target.id);

    if (updateError) {
      throw updateError;
    }

    // 3. 成功レスポンス
    return NextResponse.json({ 
      success: true, 
      message: '送信キューに追加しました。PCのロボットが処理を開始します。',
      target_url: target.url 
    });

  } catch (e: any) {
    console.error('API Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}