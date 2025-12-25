'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TargetsPage() {
  const [user, setUser] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  // 入力項目追加 (totalCount)
  const [newTarget, setNewTarget] = useState({ 
    url: '', company: '', packageName: '', industry: '', location: '', totalCount: 100
  });

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      fetchPackages(u.userId);
    }
  }, []);

  const fetchPackages = async (userId: string) => {
    // total_countも取得
    const { data } = await supabase.from('targets')
      .select('package_name, status, industry, location, total_count')
      .eq('owner_id', userId);
    
    if (data) {
      const grouped: any = {};
      data.forEach((item: any) => {
        const name = item.package_name || '未分類';
        if (!grouped[name]) {
          grouped[name] = { 
            // DBに保存されたマスタの総数を使う
            totalCountMaster: item.total_count || 0,
            // 実際の登録件数ベースの集計
            total: 0, pending: 0, completed: 0, error: 0,
            industry: item.industry, location: item.location 
          };
        }
        grouped[name].total += 1;
        if (item.status === 'pending') grouped[name].pending += 1;
        if (item.status === 'processing') grouped[name].pending += 1;
        if (item.status === 'completed') grouped[name].completed += 1;
        if (item.status === 'error') grouped[name].error += 1;
      });

      const result = Object.keys(grouped).map(name => {
        const g = grouped[name];
        let statusLabel = '未着手';
        let statusColor = 'bg-slate-100 text-slate-500';
        // 進捗率はマスタ総数を分母にする
        const progress = g.totalCountMaster > 0 ? Math.round(((g.completed + g.error) / g.totalCountMaster) * 100) : 0;

        if (g.totalCountMaster > 0 && g.completed + g.error >= g.totalCountMaster) {
          statusLabel = '完了';
          statusColor = 'bg-emerald-100 text-emerald-700';
        } else if (progress > 0) {
          statusLabel = '進行中';
          statusColor = 'bg-indigo-100 text-indigo-700';
        }

        return { name, ...g, statusLabel, statusColor, progress };
      });

      setPackages(result);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('ログインしてください');
    if (!newTarget.packageName) return alert('パッケージ名を入力してください');
    
    const { error } = await supabase.from('targets').insert({
      owner_id: user.userId,
      url: newTarget.url,
      company_name: newTarget.company,
      package_name: newTarget.packageName,
      industry: newTarget.industry,
      location: newTarget.location,
      total_count: newTarget.totalCount, // 保存
      status: 'pending'
    });
    if (!error) {
      alert('リストに追加しました');
      // 連続入力しやすいように一部の値は残す
      setNewTarget({ ...newTarget, url: '', company: '' });
      fetchPackages(user.userId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">ターゲット管理</h2>
        <p className="text-slate-500 mt-2">営業リストの登録とタグ付けを行います。</p>
      </header>

      {/* 新規登録カード */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-12">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
          <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm shadow-indigo-200 shadow-lg">＋</span>
          新規リスト追加
        </h3>
        <form onSubmit={handleAdd} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">パッケージ名 (案件名)</label>
              <input required placeholder="例：建設業リスト 2025" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={newTarget.packageName} onChange={e => setNewTarget({...newTarget, packageName: e.target.value})} />
            </div>
             <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">収録予定社数</label>
              <input required type="number" placeholder="例：100" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold"
                value={newTarget.totalCount} onChange={e => setNewTarget({...newTarget, totalCount: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">会社名 (テスト用1件目)</label>
              <input placeholder="株式会社〇〇" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={newTarget.company} onChange={e => setNewTarget({...newTarget, company: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">業界タグ (カンマ区切り)</label>
              <input placeholder="建設, 不動産, リフォーム" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={newTarget.industry} onChange={e => setNewTarget({...newTarget, industry: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">エリアタグ (カンマ区切り)</label>
              <input placeholder="千葉県, 東金市, 関東全域" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={newTarget.location} onChange={e => setNewTarget({...newTarget, location: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">お問い合わせURL (テスト用1件目)</label>
            <input required type="url" placeholder="https://..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={newTarget.url} onChange={e => setNewTarget({...newTarget, url: e.target.value})} />
             <p className="text-xs text-slate-400 mt-2">※現在はデモのため、1件ずつ登録します。将来的にCSVインポートに対応予定です。</p>
          </div>
          
          <div className="flex justify-end">
            <button className="bg-slate-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-900/30">
              リストに追加
            </button>
          </div>
        </form>
      </div>

      {/* 一覧表示 */}
      <h3 className="font-bold text-slate-600 mb-4 px-2">登録済みパッケージ状況</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800">{pkg.name}</h4>
                <span className={`text-[10px] px-2 py-1 rounded font-bold ${pkg.statusColor}`}>{pkg.statusLabel}</span>
             </div>
             <div className="text-sm font-bold text-slate-600 mb-2">収録: {pkg.totalCountMaster}社</div>
             <div className="text-xs text-slate-400 mb-4 flex flex-wrap gap-1">
               {pkg.industry && pkg.industry.split(',').map((t:string,i:number)=><span key={i} className="bg-slate-100 px-1 rounded">#{t.trim()}</span>)}
               {pkg.location && pkg.location.split(',').map((t:string,i:number)=><span key={i} className="bg-slate-100 px-1 rounded">📍{t.trim()}</span>)}
             </div>
             <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: `${pkg.progress}%` }}></div>
             </div>
             <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>完了: {pkg.completed + pkg.error}件</span>
                <span className="font-bold">{pkg.progress}%</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}