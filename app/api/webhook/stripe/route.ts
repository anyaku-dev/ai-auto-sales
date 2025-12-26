import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe初期化（最新バージョンに対応）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover' as any,
});

// 管理権限キーを使用してSupabaseAdminを初期化
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ★重要：VercelのEnvironment Variablesに設定が必要
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // Webhookの正当性を検証（署名チェック）
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Webhook Signature Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 1. 決済完了イベント（checkout.session.completed）をキャッチ
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // metadataまたはcustomer_detailsからメールアドレスを抽出
    const customerEmail = session.metadata?.email || session.customer_details?.email;

    if (customerEmail) {
      console.log(`🔔 決済成功通知を受信: ${customerEmail}`);

      // 2. profilesテーブルへのUpsert（なければ作成、あれば更新）
      // これにより、仮登録時にデータがなくても、決済完了時に確実にDBへ保存されます
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          email: customerEmail,
          status: 'active', // ステータスを「有効」に
          stripe_customer_id: session.customer as string,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'email' // emailが重複した場合は既存の行を更新する
        });

      if (error) {
        console.error('❌ Supabase Upsert Error:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`✅ ユーザー ${customerEmail} を有効化しました。`);
    } else {
      console.error('❌ セッションにメールアドレスが含まれていません。');
    }
  }

  // Stripeに対して「無事に受け取った」ことを報告（200 OK）
  return NextResponse.json({ received: true }, { status: 200 });
}