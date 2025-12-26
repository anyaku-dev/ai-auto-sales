import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // typescriptのエラーを回避するため、キャストするか最新を記述します
  apiVersion: '2025-12-15.clover' as any,
});

// サービスロールキー（管理権限）を使用してSupabaseを初期化
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ★重要：必ずサーバー専用のService Role Keyを使ってください
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET! // Stripe管理画面で取得する秘密鍵
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 支払い完了イベントをキャッチ
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.metadata?.email;

    if (customerEmail) {
      // 1. Supabase Authでユーザーが存在するか確認
      // (仮登録時にユーザーが作成されている、または新規作成するロジック)
      
      // 2. profilesテーブルのステータスを 'active' に更新
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          status: 'active',
          stripe_customer_id: session.customer as string 
        })
        .eq('email', customerEmail);

      if (error) {
        console.error('Supabase update error:', error);
        return NextResponse.json({ error: 'DB Update Failed' }, { status: 500 });
      }
      
      console.log(`User ${customerEmail} is now active.`);
    }
  }

  return NextResponse.json({ received: true });
}