import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  try {
    // 1. Supabaseクライアントの初期化
    const supabase = createMiddlewareClient({ req, res });

    // 2. セッション情報の取得
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const pathname = req.nextUrl.pathname;

    // 3. ログインしていないユーザーが /mypage にアクセスしたら /login へ
    if (!session && pathname.startsWith('/mypage')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 4. 既にログインしているユーザーが /login や /signup にアクセスしたら /mypage へ
    if (session && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/mypage', req.url));
    }

  } catch (error) {
    console.error('Middleware error:', error);
    // エラーが起きても、サイト自体が真っ白にならないように次へ進ませる
    return res;
  }

  return res;
}

// ミドルウェアを適用しないパス（ここが重要！）
export const config = {
  matcher: [
    /*
     * 以下のパスを除外:
     * - signup, login, api関連
     * - 静的ファイル（画像, CSS, JS）
     */
    '/((?!signup|login|api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)',
  ],
};