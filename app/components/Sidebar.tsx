'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase'; // 接続を統一
import { LayoutDashboard, User, LogOut, ShieldCheck, CreditCard } from 'lucide-react';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // ログイン・登録関連のページ以外ならログインへ飛ばす
        if (pathname !== '/login' && pathname !== '/signup' && pathname !== '/signup/complete') {
          router.push('/login');
        }
        setLoading(false);
        return;
      }

      // Profilesテーブルから情報を取得
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
    
    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { name: 'ダッシュボード', icon: <LayoutDashboard size={20} />, href: '/mypage' },
    { name: 'アカウント設定', icon: <User size={20} />, href: '/settings' },
    { name: 'プラン・決済', icon: <CreditCard size={20} />, href: '/billing' },
  ];

  return (
    <aside className="w-72 h-screen bg-[#0F172A] text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl">
      {/* ロゴエリア */}
      <div className="p-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">AI Auto Sales</span>
        </div>
      </div>

      {/* メニュー */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'} transition-colors`}>
                {item.icon}
              </span>
              <span className="font-semibold text-[15px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* ユーザープロフィール */}
      <div className="p-4 mx-4 mb-8 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-slate-700">
            {profile?.email?.slice(0, 1).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate leading-none mb-1.5">
              {profile?.email?.split('@')[0]}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="flex w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {profile?.status === 'active' ? 'Permanent License' : 'Trial Plan'}
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all border border-transparent hover:border-slate-600"
        >
          <LogOut size={14} />
          ログアウト
        </button>
      </div>
    </aside>
  );
}