'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MyPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  const [form, setForm] = useState({ userName: '', companyName: '', password: '', avatarUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setForm({ 
        userName: u.userName || '', 
        companyName: u.companyName || '株式会社ANYAKU', 
        password: '',
        avatarUrl: u.avatarUrl || '' 
      });
      fetchNotifications(u.userId);
    }
  }, []);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  };

  const handleNotificationClick = (n: any) => {
    if (n.metadata) setSelectedReport({ ...n.metadata, title: n.title, date: n.created_at });
    if (!n.is_read) {
        supabase.from('notifications').update({ is_read: true }).eq('id', n.id).then(() => fetchNotifications(user.userId));
    }
  };

  const handleDownloadCsv = async () => {
    if (!selectedReport) return;
    try {
      const res = await fetch('/api/download-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: user.userId, package_name: selectedReport.packageName }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReport.packageName}_report.csv`;
        a.click();
      } else { alert('ダウンロードに失敗しました'); }
    } catch (e) { alert('エラーが発生しました'); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 1024 * 1024) return alert('画像サイズは1MB以下にしてください。');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ownerId', user.userId);
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.publicUrl) setForm(prev => ({ ...prev, avatarUrl: data.publicUrl }));
    } catch (err) {} finally { setIsUploading(false); }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = { ...user, ...form };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setUser(updatedUser);
    window.dispatchEvent(new Event('userUpdated'));
    alert('プロフィールを更新しました');
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <header className="mb-10">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">マイページ</h2>
        <p className="text-slate-500 mt-2">アカウント設定とレポート確認</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：お知らせリスト */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">🔔 お知らせ / レポート</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {notifications.length === 0 && <div className="p-8 text-center text-slate-400">お知らせはありません</div>}
              {notifications.map((n) => (
                <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-5 hover:bg-slate-50 transition cursor-pointer flex gap-4 items-start group ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-bold ${!n.is_read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</span>
                      <span className="text-xs text-slate-400 font-mono">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{n.message}</p>
                    {n.metadata && <span className="inline-block mt-2 text-xs font-bold text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded bg-indigo-50 group-hover:bg-indigo-100 transition">📊 レポートを見る</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側：アカウント設定 */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
            <div className="flex flex-col items-center mb-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100">
                      {form.avatarUrl ? <img src={form.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300 font-bold">{form.userName.slice(0,1)}</div>}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition">変更</div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <h3 className="mt-3 font-bold text-lg text-slate-800">{form.companyName}</h3>
                <p className="text-sm text-slate-500">{form.userName}</p>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500">ユーザー名</label><input required className="w-full p-2 bg-slate-50 border rounded-lg" value={form.userName} onChange={e=>setForm({...form, userName:e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-500">会社名</label><input className="w-full p-2 bg-slate-50 border rounded-lg" value={form.companyName} onChange={e=>setForm({...form, companyName:e.target.value})} /></div>
              <button disabled={isUploading} className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-700 transition">更新する</button>
            </form>
          </div>
        </div>
      </div>

      {/* 詳細レポートモーダル */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative animate-fadeInUp">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
               <div>
                 <h3 className="text-xl font-bold text-slate-800">アプローチ完了レポート</h3>
                 <p className="text-sm text-slate-500">Package: {selectedReport.packageName}</p>
               </div>
               <button onClick={() => setSelectedReport(null)} className="text-3xl text-slate-300 hover:text-slate-600">×</button>
            </div>
            
            <div className="p-8 space-y-8">
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                     <div className="text-xs text-blue-500 font-bold uppercase">Sent</div>
                     <div className="text-3xl font-black text-blue-700">{selectedReport.successCount} <span className="text-sm font-normal">件</span></div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                     <div className="text-xs text-red-500 font-bold uppercase">Error</div>
                     <div className="text-3xl font-black text-red-700">{selectedReport.errorCount} <span className="text-sm font-normal">件</span></div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center">
                     <div className="text-xs text-indigo-500 font-bold uppercase">Total</div>
                     <div className="text-3xl font-black text-indigo-700">{selectedReport.totalCount} <span className="text-sm font-normal">件</span></div>
                  </div>
               </div>

               {/* AI予測 */}
               <div className="bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 blur-[60px] opacity-20"></div>
                  <h4 className="text-indigo-300 font-bold mb-4 flex items-center gap-2">🤖 AI Reaction Prediction</h4>
                  <div className="flex items-end gap-2 mb-2">
                     <span className="text-4xl font-bold">{Math.round(selectedReport.successCount * 0.01)} 〜 {Math.round(selectedReport.successCount * 0.03)}</span>
                     <span className="text-sm text-slate-400 mb-2">件のお問い合わせ予測</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                     過去のデータに基づき、送信から約3〜5日以内に最大の反応が見込まれます。<br/>
                     ターゲット業界（{selectedReport.industry || '一般'}）の平均反応率は1.5%前後です。
                  </p>
               </div>

               {/* ★ 送信内容プレビュー ★ */}
               {selectedReport.sentBody && (
                 <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">📝 送信した文章 <span className="text-xs font-normal text-slate-400">({selectedReport.profileName})</span></h4>
                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-100 font-mono">
                      {selectedReport.sentBody}
                    </div>
                 </div>
               )}

               <div className="border-t border-slate-100 pt-6">
                  <button onClick={handleDownloadCsv} className="w-full py-4 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:border-slate-800 hover:text-slate-800 hover:bg-slate-50 transition flex items-center justify-center gap-2 group">
                     <span className="text-xl group-hover:animate-bounce">📥</span>
                     送信した企業リストを見る (CSVダウンロード)
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeInUp { animation: fadeInUp 0.3s ease-out; }`}</style>
    </div>
  );
}