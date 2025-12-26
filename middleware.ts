// @ts-nocheck
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    const pathname = req.nextUrl.pathname;

    // 未ログインでマイページへ行こうとしたらログインへ
    if (!session && pathname.startsWith('/mypage')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // ログイン済みでログイン/登録へ行こうとしたらマイページへ
    if (session && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/mypage', req.url));
    }
  } catch (e) {
    // ミドルウェアでエラーが起きても画面を止めない
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    // signup と login をログインチェックの対象から外す
    '/((?!signup|login|api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)',
  ],
};