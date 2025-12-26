'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('エラーが発生しました。');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center pt-24 px-6 text-slate-900">
      <div className="w-full max-w-[500px] bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
        <h1 className="text-2xl font-medium mb-8 tracking-tight text-center">AI Auto Sales を開始する</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">ビジネスメールアドレス</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="name@company.com"
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-5 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : '決済手続きへ進む'}
          </button>
        </form>
        <p className="mt-8 text-center text-[13px] text-slate-400">一括購入：298,000円（税別）</p>
      </div>
    </div>
  );
}