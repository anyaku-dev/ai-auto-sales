'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilesPage() {
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AIモーダル関連
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteStep, setRewriteStep] = useState<'input' | 'result'>('input');
  const [rewriteInputs, setRewriteInputs] = useState({ productName:'', productUrl:'', targetType:'', coreValue:'', goal:'' });
  const [generatedBody, setGeneratedBody] = useState('');
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [form, setForm] = useState({ 
    name: '', company: '', department: '', 
    lastName: '', firstName: '', 
    phone: '', email: '', url: '', 
    subject: '', body: '' 
  });

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      fetchProfiles(u.userId);
    }
  }, []);

  const fetchProfiles = async (userId: string) => {
    const { data } = await supabase.from('sender_profiles')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (data) setProfiles(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('ログインしてください');

    setIsAnalyzing(true);
    let analyzedTags = '';
    if (form.url && form.url.startsWith('http')) {
      try {
        const res = await fetch('/api/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: form.url }),
        });
        const data = await res.json();
        if (data.tags) analyzedTags = data.tags;
      } catch (err) {}
    }

    const payload = {
      owner_id: user.userId,
      profile_name: form.name,
      sender_company: form.company,
      sender_department: form.department,
      sender_last_name: form.lastName,
      sender_first_name: form.firstName,
      phone_number: form.phone,
      sender_email: form.email,
      sender_url: form.url,
      subject_title: form.subject,
      message_body: form.body,
      analyzed_industry_tags: analyzedTags
    };

    let error;
    if (editingId) {
      const res = await supabase.from('sender_profiles').update(payload).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('sender_profiles').insert(payload);
      error = res.error;
    }

    setIsAnalyzing(false);

    if (!error) {
      alert(editingId ? '✅ プロフィールを更新しました' : '✅ プロフィールを保存しました');
      resetForm();
      fetchProfiles(user.userId);
    } else {
      alert('エラー: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;
    const { error } = await supabase.from('sender_profiles').delete().eq('id', id);
    if (!error && user) fetchProfiles(user.userId);
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.profile_name,
      company: p.sender_company || '',
      department: p.sender_department || '',
      lastName: p.sender_last_name || '',
      firstName: p.sender_first_name || '',
      phone: p.phone_number || '',
      email: p.sender_email || '',
      url: p.sender_url || '',
      subject: p.subject_title || '',
      body: p.message_body || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ 
      name: '', company: '', department: '', 
      lastName: '', firstName: '', 
      phone: '', email: '', url: '', 
      subject: '', body: '' 
    });
  };

  // AI関連アクション
  const handleOpenRewriteModal = () => {
    // 既に本文がある場合は修正モードへ
    if (form.body && form.body.length > 10) {
        setGeneratedBody(form.body);
        setRewriteStep('result');
    } else {
        setRewriteStep('input');
        setRewriteInputs({ productName:'', productUrl: form.url || '', targetType:'', coreValue:'', goal:'' });
        setGeneratedBody('');
    }
    setIsRewriteModalOpen(true);
  };
  
  const handleStartNewAi = () => {
    setRewriteStep('input');
    setGeneratedBody('');
  };

  const runAiGenerate = async (mode: 'draft' | 'refine') => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode,
          inputs: rewriteInputs,
          currentText: generatedBody,
          refineInstruction: refineInstruction
        }),
      });
      const data = await res.json();
      if (data.resultText) {
        setGeneratedBody(data.resultText);
        if (mode === 'draft') setRewriteStep('result');
        setRefineInstruction('');
      }
    } catch (e) { alert('通信エラー'); }
    setIsAiGenerating(false);
  };

  const handleApplyGeneratedText = () => {
    setForm({ ...form, body: generatedBody });
    setIsRewriteModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">商材・本文設定</h2>
          <p className="text-slate-500 mt-1">営業に使用する商材ごとのプロフィールと本文を管理します。</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-8 relative">
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center rounded-xl">
                <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mb-3"></div>
                <p className="text-sm font-bold text-blue-600 animate-pulse">AIがURLから商材を分析中...</p>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <span className={`w-1 h-6 rounded-full ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}></span>
                {editingId ? '商材を編集' : '新規登録'}
              </h3>
              {editingId && <button onClick={resetForm} className="text-xs text-slate-500 underline">キャンセル</button>}
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              {/* 基本情報フォーム (省略なし) */}
              <div><label className="block text-xs font-bold text-slate-500 mb-1">管理用ネーム</label>
              <input required className="w-full p-2.5 bg-slate-50 border rounded-lg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-slate-400 border-b pb-1">送信者情報</p>
                <div><input required placeholder="会社名" className="w-full p-2.5 bg-slate-50 border rounded-lg" value={form.company} onChange={e => setForm({...form, company: e.target.value})} /></div>
                <div><input required placeholder="部署名" className="w-full p-2.5 bg-slate-50 border rounded-lg" value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                   <input required placeholder="姓" className="w-full p-2.5 bg-slate-50 border rounded-lg" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                   <input required placeholder="名" className="w-full p-2.5 bg-slate-50 border rounded-lg" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                </div>
                <div><input required placeholder="電話番号" className="w-full p-2.5 bg-slate-50 border rounded-lg" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><input required placeholder="Email" className="w-full p-2.5 bg-slate-50 border rounded-lg" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><input required type="url" placeholder="企業URL" className="w-full p-2.5 bg-slate-50 border rounded-lg" value={form.url} onChange={e => setForm({...form, url: e.target.value})} /></div>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">件名</label>
                <input required className="w-full p-2.5 bg-slate-50 border rounded-lg font-bold" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                   <label className="block text-xs font-bold text-slate-500">本文</label>
                   <button type="button" onClick={handleOpenRewriteModal} className="text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 rounded-full hover:shadow-lg transition">
                     ✨ AIで高反応率の文章を作成
                   </button>
                </div>
                <textarea required rows={6} className="w-full p-3 bg-slate-50 border rounded-lg text-sm" value={form.body} onChange={e => setForm({...form, body: e.target.value})} />
              </div>
              
              <button disabled={isAnalyzing} className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-lg ${editingId ? 'bg-orange-500' : 'bg-slate-900'}`}>
                {isAnalyzing ? '分析中...' : (editingId ? '情報を更新する' : '保存する')}
              </button>
            </form>
          </div>
        </div>

        {/* 右側リスト */}
        <div className="xl:col-span-2 space-y-4">
          <h3 className="font-bold text-lg text-slate-800 mb-2">登録済みリスト</h3>
          <div className="grid grid-cols-1 gap-4">
            {profiles.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => handleEdit(p)} className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded">編集</button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-600 rounded">削除</button>
                </div>
                <h4 className="font-bold text-lg text-slate-800">{p.profile_name}</h4>
                <div className="text-xs text-slate-400 mt-1 mb-2">URL: {p.sender_url}</div>
                <div className="text-sm text-slate-500 line-clamp-2">{p.message_body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI作成モーダル */}
      {isRewriteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col border border-purple-100">
             <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex justify-between items-center rounded-t-3xl">
               <h4 className="text-xl font-bold text-purple-800">✨ AIコールドメール生成</h4>
               <button onClick={() => setIsRewriteModalOpen(false)} className="text-2xl text-slate-400">×</button>
             </div>
             <div className="p-6 overflow-y-auto flex-1">
                {rewriteStep === 'input' ? (
                   <div className="space-y-4">
                     <div><label className="text-sm font-bold text-slate-700">商材名</label><input className="w-full p-3 border rounded-xl" value={rewriteInputs.productName} onChange={e=>setRewriteInputs({...rewriteInputs, productName:e.target.value})} /></div>
                     <div><label className="text-sm font-bold text-slate-700">商材URL</label><input className="w-full p-3 border rounded-xl" value={rewriteInputs.productUrl} onChange={e=>setRewriteInputs({...rewriteInputs, productUrl:e.target.value})} /></div>
                     <div><label className="text-sm font-bold text-slate-700">ターゲット業種</label><input className="w-full p-3 border rounded-xl" value={rewriteInputs.targetType} onChange={e=>setRewriteInputs({...rewriteInputs, targetType:e.target.value})} /></div>
                     <div><label className="text-sm font-bold text-slate-700">届けたい価値</label><input className="w-full p-3 border rounded-xl" value={rewriteInputs.coreValue} onChange={e=>setRewriteInputs({...rewriteInputs, coreValue:e.target.value})} /></div>
                     <div><label className="text-sm font-bold text-slate-700">ゴール</label><input className="w-full p-3 border rounded-xl" value={rewriteInputs.goal} onChange={e=>setRewriteInputs({...rewriteInputs, goal:e.target.value})} /></div>
                   </div>
                ) : (
                   <div className="space-y-4">
                     <textarea rows={10} className="w-full p-4 border rounded-xl" value={generatedBody} onChange={e=>setGeneratedBody(e.target.value)} />
                     <div className="flex gap-2">
                       <input className="flex-1 p-3 border rounded-xl" placeholder="修正指示..." value={refineInstruction} onChange={e=>setRefineInstruction(e.target.value)} />
                       <button onClick={()=>runAiGenerate('refine')} className="bg-purple-600 text-white px-4 rounded-xl">修正</button>
                     </div>
                     <div className="text-right">
                       <button onClick={handleStartNewAi} className="text-sm text-purple-600 underline">↺ もう一度新規作成</button>
                     </div>
                   </div>
                )}
             </div>
             <div className="px-6 py-4 bg-slate-50 rounded-b-3xl border-t border-slate-200">
                {rewriteStep === 'input' ? 
                  <button onClick={()=>runAiGenerate('draft')} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">{isAiGenerating?'生成中...':'生成する'}</button> :
                  <button onClick={handleApplyGeneratedText} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold">この文章を適用</button>
                }
             </div>
          </div>
        </div>
      )}
    </div>
  );
}