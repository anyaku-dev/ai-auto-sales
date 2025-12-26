// @ts-ignore
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // セッション情報を取得
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // 1. ログインしていないユーザーが「マイページ」系にアクセスしたらログインへ飛ばす
  if (!session && pathname.startsWith('/mypage')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // 2. 既にログインしているユーザーが「ログイン/新規登録」系にアクセスしたらマイページへ飛ばす
  if (session && (pathname === '/login' || pathname === '/signup')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/mypage';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

// ミドルウェアを適用しないパスを明示的に指定
export const config = {
  matcher: [
    /*
     * 次のパス以外のすべてに適用:
     * - api/create-checkout (決済)
     * - api/webhook (Stripe通知)
     * - _next/static (静的ファイル)
     * - _next/image (画像)
     * - favicon.ico (アイコン)
     */
    '/((?!api/create-checkout|api/webhook|_next/static|_next/image|favicon.ico).*)',
  ],
};