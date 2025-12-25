'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
// ★修正ポイント：usePathname を追加
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from "@supabase/supabase-js";

export default function Sidebar() {
  const router = useRouter();
  // ★修正ポイント：現在のパスをリアルタイムで取得
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkUser = () => {
      const stored = localStorage.getItem('currentUser');
      if (!stored) {
        // ★修正ポイント：判定に pathname を使用
        if (pathname !== '/login') {
             router.push('/login');
        }
      } else {
        setUser(JSON.parse(stored));
      }
    };
    
    // 初回実行
    checkUser();

    window.addEventListener('storage', checkUser);
    // ログイン画面から送られてくる「更新合図」をキャッチ
    window.addEventListener('userUpdated', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userUpdated', checkUser);
    };
  }, [router, pathname]); // pathnameが変わるたびにもチェック

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  // ★修正ポイント：ここも pathname で判定（より確実になります）
  if (pathname === '/login') return null;

  return (
    <div className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col border-r border-slate-800 shadow-xl z-10 flex-shrink-0 sticky top-0 h-screen">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
        <div className="font-bold text-xl text-white tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm shadow-lg shadow-blue-900/50">AI</span>
          Auto Sales
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Menu</p>
        
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors group">
          <span className="group-hover:text-blue-400 transition-colors">📊</span>
          <span className="font-medium">ダッシュボード</span>
        </Link>
        <Link href="/profiles" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors group">
          <span className="group-hover:text-green-400 transition-colors">📝</span>
          <span className="font-medium">商材・本文設定</span>
        </Link>
        <Link href="/targets" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors group">
          <span className="group-hover:text-yellow-400 transition-colors">📋</span>
          <span className="font-medium">ターゲット管理</span>
        </Link>
        <Link href="/mypage" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors group">
          <span className="group-hover:text-purple-400 transition-colors">👤</span>
          <span className="font-medium">マイページ</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border border-slate-600 shadow-md">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold">
                {user?.userName?.slice(0, 1).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user?.userName || 'Guest'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.companyName || 'Free Plan'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-red-600 py-2 rounded transition-colors">
          ログアウト
        </button>
      </div>
    </div>
  );
}