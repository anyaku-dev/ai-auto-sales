import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover' as any,
});

// 管理権限キーを使用してSupabaseAdminを初期化
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // Webhookの正当性を検証
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Webhook Signature Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 1. 決済完了イベントをキャッチ
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // メールアドレスの抽出（metadataを優先、なければcustomer_detailsから）
    const customerEmail = session.metadata?.email || session.customer_details?.email;

    if (customerEmail) {
      console.log(`🔔 決済成功通知を受信: ${customerEmail}`);

      // 2. profilesテーブルへの登録・更新（Upsert）
      // ここで ID を渡さないことで、DB側の DEFAULT gen_random_uuid() を発動させます
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          email: customerEmail,
          status: 'active',
          stripe_customer_id: session.customer as string,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'email' // emailが一致する行があれば更新、なければ新規作成
        });

      if (error) {
        // ここでエラーが出る場合は、まだDB側の id 設定（DEFAULT値）が反映されていない可能性があります
        console.error('❌ Supabase Upsert Error:', JSON.stringify(error, null, 2));
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`✅ ユーザー ${customerEmail} をDBに保存/有効化しました。`);
    } else {
      console.error('❌ セッションにメールアドレスが含まれていません。');
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}