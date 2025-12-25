// app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 仮の認証ロジック
    if (id === 'admin' && pass === 'admin') {
      // ログイン成功情報を保存
      const userData = {
        userId: 'admin_user_001', // DBのowner_idと一致させる固定ID
        userName: 'AdminANYAKU',
        role: 'admin'
      };
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      // ダッシュボードへ移動
      router.push('/');
    } else {
      setError('IDまたはパスワードが違います');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">AI Auto Sales</h1>
          <p className="text-slate-500 text-sm mt-2">アカウントにログインしてください</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ユーザーID</label>
            <input 
              type="text" 
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">パスワード</label>
            <input 
              type="password" 
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20">
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}