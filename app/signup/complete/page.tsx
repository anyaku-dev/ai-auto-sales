'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CompletePage() {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 本来はURLパラメータやSessionからメールアドレスを自動取得します
  const email = "テスト中のメールアドレス"; 

  const handleActivate = async () => {
    setIsSubmitting(true);
    const res = await fetch('/api/activate-account', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      alert('アカウントが有効化されました。ログイン画面へ移動します。');
      router.push('/login');
    } else {
      alert('エラーが発生しました。決済が完了しているか確認してください。');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center pt-24 px-6 text-slate-900">
      <div className="w-full max-w-[640px] bg-white border border-slate-200 rounded-2xl p-12 shadow-sm">
        <h2 className="text-2xl font-medium mb-6 tracking-tight">決済のお手続きが完了しました。</h2>
        <p className="text-slate-500 mb-10 leading-relaxed">
          ご登録ありがとうございます。最後にログイン用のパスワードを設定してください。設定後、すぐにダッシュボードをご利用いただけます。
        </p>

        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-3 uppercase">ログインパスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上の英数字"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            onClick={handleActivate}
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white font-bold py-5 rounded-xl hover:bg-slate-800 transition"
          >
            {isSubmitting ? '処理中...' : 'アカウントを有効化する'}
          </button>
        </div>
      </div>
    </div>
  );
}