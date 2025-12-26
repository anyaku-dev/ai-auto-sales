'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import ConfettiEffect from '../components/ConfettiEffect';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const isActivated = searchParams.get('message') === 'activated';

  useEffect(() => {
    if (isActivated) {
      setShowConfetti(true);
    }
  }, [isActivated]);

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('メールアドレスまたはパスワードが正しくありません。');
      setLoading(false);
    } else if (data.session) {
      console.log('✅ ログイン成功');
      // ログイン成功後、キャッシュをクリアしてマイページへ
      router.refresh();
      router.push('/mypage');
    }
  };

  // パスワードリセット処理
  const handleResetPassword = async () => {
    if (!email) {
      setError('パスワードをリセットするには、先にメールアドレスを入力してください。');
      return;
    }

    setResetLoading(true);
    setError('');
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset-password`,
    });

    if (resetError) {
      setError(`エラー: ${resetError.message}`);
    } else {
      setMessage({ type: 'success', text: 'パスワード再設定用のメールを送信しました。メールボックスを確認してください。' });
    }
    setResetLoading(false);
  };

  return (
    <div className="w-full max-w-[440px] px-6">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}

      {isActivated && (
        <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="bg-emerald-500 rounded-full p-1 mt-0.5">
            <CheckCircle2 className="text-white" size={18} />
          </div>
          <div>
            <h3 className="text-emerald-900 font-bold text-[15px]">アカウントが有効化されました</h3>
            <p className="text-emerald-700 text-sm mt-1 leading-relaxed font-medium">
              ご登録ありがとうございます！<br />
              設定したパスワードでログインしてください。
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className={`mb-8 p-6 rounded-3xl flex items-start gap-4 ${message.type === 'success' ? 'bg-blue-50 border border-blue-100' : 'bg-red-50 border border-red-100'}`}>
          <CheckCircle2 className={message.type === 'success' ? 'text-blue-500' : 'text-red-500'} size={20} />
          <p className={`text-sm font-medium ${message.type === 'success' ? 'text-blue-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[32px] p-10 md:p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ログイン</h1>
          <p className="text-slate-500 text-[14px] mt-2 font-medium">
            AI Auto Sales サービスを開始する
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-7">
          <div className="space-y-2.5">
            <label className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                パスワード
              </label>
              <button 
                type="button" 
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-indigo-600 text-[12px] font-bold hover:underline disabled:opacity-50"
              >
                {resetLoading ? '送信中...' : 'パスワードを忘れた'}
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <p className="text-red-600 text-sm font-bold">
                {error}
              </p>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-[17px] hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group shadow-xl shadow-slate-200 mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                ログイン
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-10 text-center">
        <p className="text-slate-400 text-sm font-medium">
          まだアカウントをお持ちでないですか？<br />
          <button 
            onClick={() => router.push('/signup')}
            className="text-slate-900 font-bold mt-2 hover:underline tracking-tight"
          >
            新規登録（仮登録）へ
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-12 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Suspense fallback={<Loader2 className="animate-spin text-slate-400" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}