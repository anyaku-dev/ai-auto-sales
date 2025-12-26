'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

function RegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URLパラメータ (?email=xxx) からメールアドレスを取得
  const email = searchParams.get('email') || '';
  
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください。');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/activate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // 成功したら自動的にログインページ、またはダッシュボードへ
        router.push('/login?message=activated');
      } else {
        const data = await res.json();
        setError(data.error || '有効化に失敗しました。事務局へお問い合わせください。');
      }
    } catch (err) {
      setError('通信エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!email) {
    return (
      <div className="text-center p-10 bg-white border rounded-2xl">
        <p className="text-red-500">不正なアクセスです。お送りしたメールのリンクから再度お試しください。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[640px] bg-white border border-slate-200 rounded-2xl p-10 md:p-14 shadow-sm">
      <div className="flex items-center gap-3 mb-10 text-emerald-600 bg-emerald-50 w-fit px-4 py-2 rounded-full text-sm font-bold">
        <CheckCircle2 size={18} />
        お支払いが確認されました
      </div>

      <h2 className="text-2xl font-medium mb-4 tracking-tight">アカウントを有効化します</h2>
      <p className="text-slate-500 mb-10 leading-relaxed text-[15px]">
        以下のメールアドレスに対してライセンスを付与しました。<br />
        今後使用するログインパスワードを設定してください。
      </p>

      <form onSubmit={handleActivate} className="space-y-8">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
            対象アカウント
          </label>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-500 font-medium">
            {email}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
            設定するパスワード
          </label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8文字以上の英数字"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {error && <p className="mt-3 text-red-500 text-sm font-medium">{error}</p>}
        </div>

        <button
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white font-bold py-5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-3 text-lg"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'アカウントを有効化して開始する'}
        </button>
      </form>
    </div>
  );
}

// Next.jsの仕様上、useSearchParamsを使う場合はSuspenseで囲む必要があります
export default function CompletePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center pt-24 px-6 text-slate-900">
      <Suspense fallback={<Loader2 className="animate-spin text-slate-400" />}>
        <RegistrationForm />
      </Suspense>
    </div>
  );
}