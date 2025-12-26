import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 最新のSDKバージョンに合わせた初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // TypeScriptのエラーを回避しつつ、SDKの最新バージョンを使用
  apiVersion: '2025-12-15.clover' as any,
});

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが必要です。' }, { status: 400 });
    }

    // Stripe Checkout Sessionの作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email, // ユーザーの入力を決済画面にプリセット
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'AI Auto Sales 永久ライセンス',
              description: '営業自動化ロボットの全機能利用権（一括払い）',
            },
            unit_amount: 327800, // 298,000円 + 消費税10%
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // ★重要：戻り先のURLにemailパラメータを付与し、本登録画面で再入力を不要にする
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/signup/complete?email=${encodeURIComponent(email)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/signup`,
      
      // Webhookでユーザーを特定するためのメタデータ
      metadata: {
        email: email,
      },
    });

    // 決済URLをフロントエンドに返却
    return NextResponse.json({ url: session.url });
    
  } catch (err: any) {
    console.error('Stripe Session Error:', err);
    return NextResponse.json(
      { error: '決済セッションの作成に失敗しました。' }, 
      { status: 500 }
    );
  }
}