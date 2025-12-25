'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TimerData = { startTime: number; elapsed: string; };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [totalSentCount, setTotalSentCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [runningPackages, setRunningPackages] = useState<{[key: string]: boolean}>({});
  const [timers, setTimers] = useState<{[key: string]: TimerData}>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [visibleQueueNames, setVisibleQueueNames] = useState<string[]>([]);

  // モーダル・AI関連
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [targetPackageForModal, setTargetPackageForModal] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteStep, setRewriteStep] = useState<'input' | 'result'>('input');
  const [rewriteInputs, setRewriteInputs] = useState({ productName:'', productUrl:'', targetType:'', coreValue:'', goal:'' });
  const [generatedBody, setGeneratedBody] = useState('');
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState('INITIALIZING...');
  const [progress, setProgress] = useState(0);

  // 新機能用ステート
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isAnalyzingCsv, setIsAnalyzingCsv] = useState(false);
  const [uploadedPackageNames, setUploadedPackageNames] = useState<string[]>([]); 

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      loadAllData(u.userId);
      fetchNotifications(u.userId);
      const savedQueues = localStorage.getItem('visibleQueueNames');
      if (savedQueues) setVisibleQueueNames(JSON.parse(savedQueues));
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') Notification.requestPermission();
    
    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(pkgName => {
          if (runningPackages[pkgName]) {
             const diff = Math.floor((Date.now() - next[pkgName].startTime) / 1000);
             next[pkgName].elapsed = `${Math.floor(diff / 60)}m ${diff % 60}s`;
             changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runningPackages]);

  // AI Animation Logic
  useEffect(() => {
    if (isAiGenerating || isAnalyzingCsv) {
      const texts = isAnalyzingCsv 
        ? ["READING FILE STRUCTURE...", "DETECTING COMPANY NAMES...", "VERIFYING CONTACT URLS...", "CATEGORIZING INDUSTRIES..."]
        : ["CONNECTING TO NEURAL NETWORK...", "ANALYZING TARGET PSYCHOLOGY...", "OPTIMIZING SALES COPY...", "GENERATING MAGIC WORDS..."];
      let i = 0;
      const timer = setInterval(() => { setLoadingText(texts[i % texts.length]); i++; }, 800);
      return () => clearInterval(timer);
    }
  }, [isAiGenerating, isAnalyzingCsv]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAiGenerating || isAnalyzingCsv) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 30) return prev + 2;
          if (prev < 80) return prev + 0.5;
          if (prev < 95) return prev + 0.1;
          return prev;
        });
      }, 100);
    } else if (progress > 0) {
        setProgress(100);
        setTimeout(() => setProgress(0), 800);
    }
    return () => { if(interval) clearInterval(interval); };
  }, [isAiGenerating, isAnalyzingCsv]);

  const loadAllData = async (userId: string) => {
    const { data: p } = await supabase.from('sender_profiles').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
    if (p) {
      setProfiles(p);
      if (p.length > 0 && !selectedProfileId) setSelectedProfileId(p[0].id);
    }
    fetchPackageStatus(userId);
  };

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase.from('notifications').select('*').eq('owner_id', userId).eq('is_read', false);
    if (data) setNotifications(data);
  };

  const fetchPackageStatus = async (userId: string) => {
    const { data } = await supabase.from('targets')
      .select('package_name, status, industry, location, total_count, completed_at')
      .eq('owner_id', userId);
    
    if (data) {
      let totalSent = 0;
      const grouped: any = {};
      
      data.forEach((item: any) => {
        const name = item.package_name || '未分類';
        if (!grouped[name]) {
          grouped[name] = { 
            totalCountMaster: item.total_count || 0,
            pending: 0, completed: 0, error: 0, 
            industry: item.industry || '', location: item.location || '',
            lastCompletedAt: null
          };
        }
        if (item.status === 'completed') { 
            grouped[name].completed += 1; 
            totalSent += 1;
            if (item.completed_at) {
                const currentLast = grouped[name].lastCompletedAt ? new Date(grouped[name].lastCompletedAt).getTime() : 0;
                if (new Date(item.completed_at).getTime() > currentLast) grouped[name].lastCompletedAt = item.completed_at;
            }
        }
        if (item.status === 'error') grouped[name].error += 1;
        if (item.status === 'pending' || item.status === 'processing') grouped[name].pending += 1;
      });
      setTotalSentCount(totalSent);
      const result = Object.keys(grouped).map(name => {
        const g = grouped[name];
        const progress = g.totalCountMaster > 0 ? Math.round(((g.completed + g.error) / g.totalCountMaster) * 100) : 0;
        return { name, ...g, progress };
      });
      setPackages(result);
    }
  };

  const currentProfile = profiles.find(p => p.id === selectedProfileId);

  // --- セクション分け ---
  const queuePackages = packages.filter(p => visibleQueueNames.includes(p.name));

  const recommendedPackages = packages
    .filter(p => p.progress === 0 && !visibleQueueNames.includes(p.name) && !uploadedPackageNames.includes(p.name))
    .map(p => {
      let score = 0;
      if (currentProfile?.analyzed_industry_tags && p.industry) {
        const profileTags = currentProfile.analyzed_industry_tags.split(',').map((t:string)=>t.trim().toLowerCase());
        const packageTags = p.industry.split(',').map((t:string)=>t.trim().toLowerCase());
        score = profileTags.filter((t:string) => packageTags.includes(t)).length;
      }
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const uploadedPackagesList = packages.filter(p => uploadedPackageNames.includes(p.name));

  const searchResults = packages.filter(p => {
      if (!searchQuery) return false;
      const q = searchQuery.toLowerCase();
      return (
          p.name.toLowerCase().includes(q) || 
          p.industry.toLowerCase().includes(q) || 
          p.location.toLowerCase().includes(q)
      );
  });

  // レコメンドタグ抽出
  const getRecommendTags = () => {
    const tags = new Set<string>();
    packages.forEach(p => {
        if(p.industry) p.industry.split(',').forEach((t:string) => tags.add(t.trim()));
        if(p.location) p.location.split(',').forEach((t:string) => tags.add(t.trim()));
    });
    const list = Array.from(tags);
    return list.length > 0 ? list.slice(0, 6) : ['IT', 'SaaS', '不動産', '建設', '東京都', '大阪府'];
  };

  // --- アクション ---

  const handleClickStart = (pkg: any) => {
    if (!currentProfile) return alert('商材を選択してください');
    setTargetPackageForModal(pkg);
    setEditingProfile(JSON.parse(JSON.stringify(currentProfile)));
    setIsEditingInModal(false);
    setIsConfirmModalOpen(true);
    setIsSearchModalOpen(false);
  };

  const handleRemoveFromQueue = (pkgName: string) => {
    const newQueue = visibleQueueNames.filter(name => name !== pkgName);
    setVisibleQueueNames(newQueue);
    localStorage.setItem('visibleQueueNames', JSON.stringify(newQueue));
  };

  const handleStartEditInModal = () => setIsEditingInModal(true);
  const handleSaveEditInModal = async (closeEditMode = false) => {
    if (!editingProfile) return;
    setIsSavingProfile(true);
    const { error } = await supabase.from('sender_profiles').update(editingProfile).eq('id', editingProfile.id);
    setIsSavingProfile(false);
    if (!error) { if (closeEditMode) setIsEditingInModal(false); loadAllData(user.userId); } else { alert('保存エラー: ' + error.message); }
  };
  const handleDuplicateAndEdit = async () => {
    if (!editingProfile) return;
    if(!confirm('複製して編集しますか？')) return;
    setIsSavingProfile(true);
    const { id, created_at, ...newProfileData } = editingProfile;
    newProfileData.profile_name = `${newProfileData.profile_name} (コピー)`;
    const { data, error } = await supabase.from('sender_profiles').insert(newProfileData).select().single();
    setIsSavingProfile(false);
    if (!error && data) { await loadAllData(user.userId); setSelectedProfileId(data.id); setEditingProfile(data); setIsEditingInModal(true); }
  };
  
  const handleConfirmAndRun = async () => {
    if (!targetPackageForModal || !selectedProfileId) return;
    setIsConfirmModalOpen(false);
    const pkgName = targetPackageForModal.name;
    if (!visibleQueueNames.includes(pkgName)) {
      const newQueue = [pkgName, ...visibleQueueNames];
      setVisibleQueueNames(newQueue);
      localStorage.setItem('visibleQueueNames', JSON.stringify(newQueue));
    }
    setRunningPackages(prev => ({ ...prev, [pkgName]: true }));
    setTimers(prev => ({ ...prev, [pkgName]: { startTime: Date.now(), elapsed: '0m 0s' } }));

    let successCount = 0;
    let errorCount = 0;
    const sentBodySnapshot = editingProfile.message_body;
    const sentProfileName = editingProfile.profile_name;

    while (true) {
      try {
        const res = await fetch('/api/process-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender_profile_id: selectedProfileId, target_package_name: pkgName, owner_id: user.userId }),
        });
        const result = await res.json();
        if (result.success) successCount++;
        else if (result.success === false) errorCount++;
        fetchPackageStatus(user.userId);
        if (result.message) break;
      } catch(e) { break; }
      await new Promise(r => setTimeout(r, 2000));
    }

    setRunningPackages(prev => ({ ...prev, [pkgName]: false }));
    await supabase.from('notifications').insert({ 
        owner_id: user.userId, 
        title: 'アプローチ完了のお知らせ', 
        message: `「${pkgName}」への営業が完了しました。クリックして詳細レポートを確認してください。`,
        metadata: { packageName: pkgName, successCount, errorCount, totalCount: successCount + errorCount, industry: targetPackageForModal.industry, sentBody: sentBodySnapshot, profileName: sentProfileName } 
    });
    fetchNotifications(user.userId);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('AI Auto Sales', { body: `「${pkgName}」への営業が完了しました！` });
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setIsAnalyzingCsv(true);
    await new Promise(r => setTimeout(r, 3000)); 
    
    const newPkgName = `Uploaded List ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    await supabase.from('targets').insert({
        owner_id: user.userId,
        package_name: newPkgName,
        company_name: '解析された企業A',
        url: 'https://example.com',
        industry: '解析済み',
        location: '日本',
        total_count: 50,
        status: 'pending'
    });

    setIsAnalyzingCsv(false);
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setUploadedPackageNames(prev => [newPkgName, ...prev]);
    
    alert('解析が完了しました！\n「アップロードしたターゲットリスト」に追加されました。');
    loadAllData(user.userId);
  };

  // AI Writer Actions
  const handleCloseRewriteModal = () => { if (rewriteStep === 'result' && generatedBody.length > 0) { if (!confirm('AIが生成した文章は保存されていません。\n反映せずに閉じてもよろしいですか？')) return; } setIsRewriteModalOpen(false); };
  const handleOpenRewriteModal = () => {
    if (editingProfile.message_body && editingProfile.message_body.length > 20) { setGeneratedBody(editingProfile.message_body); setRewriteStep('result'); setRefineInstruction(''); } else { setRewriteStep('input'); setRewriteInputs({ productName: editingProfile.profile_name || '', productUrl: editingProfile.sender_url || '', targetType:'', coreValue:'', goal:'' }); setGeneratedBody(''); }
    if (!isEditingInModal) setIsEditingInModal(true);
    setIsRewriteModalOpen(true);
  };
  const handleStartNewAi = () => { setRewriteStep('input'); setGeneratedBody(''); setRewriteInputs({ ...rewriteInputs, productName: editingProfile?.profile_name || '', productUrl: editingProfile?.sender_url || '' }); };
  const streamText = async (text: string) => { setGeneratedBody(''); const chunkSize = 3; let current = 0; return new Promise<void>((resolve) => { const interval = setInterval(() => { if (current >= text.length) { clearInterval(interval); resolve(); return; } setGeneratedBody(prev => prev + text.slice(current, current + chunkSize)); current += chunkSize; }, 5); }); };
  const runAiGenerate = async (mode: 'draft' | 'refine') => {
    setIsAiGenerating(true);
    try {
      const senderInfo = { company: editingProfile.sender_company, name: `${editingProfile.sender_last_name} ${editingProfile.sender_first_name}`, department: editingProfile.sender_department, url: editingProfile.sender_url };
      const res = await fetch('/api/ai-rewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, inputs: rewriteInputs, senderInfo, currentText: generatedBody, refineInstruction }), });
      const data = await res.json();
      setIsAiGenerating(false);
      if (data.resultText) { if (mode === 'draft') setRewriteStep('result'); setRefineInstruction(''); await streamText(data.resultText); }
    } catch (e) { setIsAiGenerating(false); alert('通信エラー'); }
  };
  const handleApplyGeneratedText = () => {
    let body = generatedBody; let subject = editingProfile.subject_title;
    if (generatedBody.includes('件名：') && generatedBody.includes('本文：')) { const subjectMatch = generatedBody.match(/件名：(.*?)\n/); if (subjectMatch) subject = subjectMatch[1].trim(); const bodyMatch = generatedBody.split('本文：')[1]; if (bodyMatch) body = bodyMatch.trim(); }
    setEditingProfile({ ...editingProfile, message_body: body, subject_title: subject });
    setIsRewriteModalOpen(false);
  };

  // --- UI Components ---
  const QueueCard = ({ pkg }: any) => {
    const isCompleted = pkg.progress === 100;
    return (
      <div className={`relative bg-white rounded-xl border p-6 flex items-center justify-between shadow-sm transition-all ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-indigo-200 ring-1 ring-indigo-50'}`}>
         {isCompleted && <button onClick={() => handleRemoveFromQueue(pkg.name)} className="absolute top-2 right-2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-white/50 hover:bg-white px-2 py-1 rounded transition">× 完了にする</button>}
         <div className="flex items-center gap-6 flex-1">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>{isCompleted ? '✓' : <span className="animate-spin">↻</span>}</div>
            <div className="flex-1">
               <div className="flex justify-between mb-1"><h4 className="font-bold text-slate-800">{pkg.name}</h4><span className={`text-xs font-bold px-2 py-0.5 rounded ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{isCompleted ? 'COMPLETED' : 'SENDING...'}</span></div>
               <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pkg.progress}%` }}></div></div>
               <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono"><span>Target: {pkg.totalCountMaster} companies</span><span>{pkg.progress}%</span></div>
            </div>
         </div>
         <div className="ml-8 border-l pl-8 border-slate-100 flex flex-col items-end gap-2"><div className="text-xs text-slate-400">Status</div>{isCompleted ? <Link href="/mypage" className="text-sm font-bold text-white bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700 transition shadow-md">詳細レポートを見る</Link> : <div className="text-sm font-bold text-indigo-600 animate-pulse">処理中...</div>}</div>
      </div>
    );
  };

  const PackageCard = ({ pkg, isRecommended = false }: any) => (
    <div className={`relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden group hover:shadow-lg hover:border-slate-300 ${isRecommended ? 'ring-2 ring-indigo-100 border-indigo-200' : 'border-slate-200'}`}>
       <div className="p-6">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h4 className="font-bold text-lg text-slate-800 line-clamp-1">{pkg.name}</h4>
                {isRecommended && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 ml-2">High Match</span>}
                <div className="flex flex-wrap gap-2 mt-2">{pkg.industry && pkg.industry.split(',').slice(0,2).map((t:string,i:number)=><span key={i} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">#{t.trim()}</span>)}</div>
             </div>
             <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">READY</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mb-4 border-t border-slate-50 pt-4"><span>収録: {pkg.totalCountMaster}社</span><span>未着手</span></div>
          <button onClick={() => handleClickStart(pkg)} className="w-full py-2 rounded-lg font-bold text-sm bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white transition-colors">送信設定へ</button>
       </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 relative font-sans">
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
        <div><h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard</h2><p className="text-sm text-slate-500 mt-1 font-medium">Welcome back, <span className="text-indigo-600">{user?.userName}</span>.</p></div>
        <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative">
            <Link href="/mypage" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md hover:scale-110 transition">{notifications.length}</Link>
          <div className="text-center px-4 border-r border-slate-100"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sent</div><div className="text-2xl font-black text-slate-800">{totalSentCount.toLocaleString()}</div></div>
          <div className="min-w-[250px]"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Active Profile</label><div className="relative"><select className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}>{profiles.length === 0 && <option>商材が登録されていません</option>}{profiles.map(p => <option key={p.id} value={p.id}>{p.profile_name}</option>)}</select></div></div>
        </div>
      </div>

      {queuePackages.length > 0 && (
        <div className="mb-12"><h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> Form Submission Queue</h3><div className="space-y-4">{queuePackages.map(pkg => <QueueCard key={pkg.name} pkg={pkg} />)}</div></div>
      )}

      {/* Recommended Targets Section */}
      <div className="mb-12">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Recommended Targets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {recommendedPackages.length > 0 ? recommendedPackages.map(pkg => <PackageCard key={pkg.name} pkg={pkg} isRecommended={true} />) : <div className="text-slate-400 text-sm col-span-3">おすすめのターゲットが見つかりませんでした。</div>}
          </div>

          <div className="flex gap-4">
             <button onClick={() => setIsSearchModalOpen(true)} className="flex-1 py-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition flex items-center justify-center gap-2 group">
                <span className="bg-indigo-50 text-indigo-600 p-2 rounded-lg group-hover:bg-indigo-100 transition">🔍</span>
                <span className="font-bold text-slate-700">送付先ターゲットをさらに探す</span>
             </button>
             <button onClick={() => setIsUploadModalOpen(true)} className="flex-1 py-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition flex items-center justify-center gap-2 group">
                <span className="bg-indigo-50 text-indigo-600 p-2 rounded-lg group-hover:bg-indigo-100 transition">📂</span>
                <span className="font-bold text-slate-700">ターゲットのアップロード</span>
             </button>
          </div>
      </div>

      {/* Uploaded List Section */}
      {uploadedPackagesList.length > 0 && (
        <div className="mb-12 animate-fadeInUp">
          <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">📂 Uploaded Target Lists</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploadedPackagesList.map(pkg => <PackageCard key={pkg.name} pkg={pkg} />)}
          </div>
        </div>
      )}

      {/* ターゲット検索モーダル (レコメンドタグ付き) */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-slate-800">ターゲット検索</h3>
                 <button onClick={() => setIsSearchModalOpen(false)} className="text-2xl text-slate-400 hover:text-slate-600">×</button>
              </div>
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                 <input autoFocus placeholder="業界、企業規模、エリアなどで検索..." className="w-full p-4 text-lg border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 
                 {!searchQuery && (
                    <div className="mt-4 flex flex-wrap gap-2 animate-fadeInUp">
                       <span className="text-xs font-bold text-slate-400 mr-2 py-2">おすすめの検索ワード:</span>
                       {getRecommendTags().map((tag, i) => (
                          <button key={i} onClick={() => setSearchQuery(tag)} className="text-sm bg-slate-200 text-slate-600 px-4 py-1.5 rounded-full hover:bg-indigo-100 hover:text-indigo-600 transition font-medium">
                             {tag}
                          </button>
                       ))}
                    </div>
                 )}
              </div>
              <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
                 {searchQuery && searchResults.length === 0 && <div className="text-center text-slate-400 mt-10">条件に一致するターゲットが見つかりません</div>}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {searchResults.map(pkg => <PackageCard key={pkg.name} pkg={pkg} />)}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* CSV/Excel アップロードモーダル */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative">
              
              {isAnalyzingCsv && (
                <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center text-cyan-400 font-mono">
                   <div className="relative w-32 h-32 mb-8">
                      <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
                      <div className="absolute inset-2 border-4 border-purple-500/30 rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl animate-pulse">AI</span></div>
                   </div>
                   <div className="text-lg tracking-widest animate-pulse">{loadingText}</div>
                   <div className="w-64 h-2 bg-slate-800 rounded-full mt-6 overflow-hidden"><div className="h-full bg-cyan-500 transition-all duration-100" style={{ width: `${progress}%` }}></div></div>
                </div>
              )}

              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center relative z-20 bg-white">
                 <h3 className="text-xl font-bold text-slate-800">ターゲットリストのアップロード</h3>
                 <button onClick={() => setIsUploadModalOpen(false)} className="text-3xl text-slate-400 hover:text-slate-600 cursor-pointer z-50 p-2 leading-none">×</button>
              </div>
              
              <div className="p-10 text-center">
                 <div 
                    className={`border-2 border-dashed rounded-2xl p-10 transition-all ${uploadFile ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); if(e.dataTransfer.files[0]) setUploadFile(e.dataTransfer.files[0]); }}
                 >
                    <div className="text-4xl mb-4">📂</div>
                    {uploadFile ? (
                       <div>
                          <p className="font-bold text-indigo-700">{uploadFile.name}</p>
                          <p className="text-sm text-indigo-500 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                       </div>
                    ) : (
                       <div>
                          <p className="font-bold text-slate-600">CSVまたはExcelファイルをドラッグ＆ドロップ</p>
                          <p className="text-sm text-slate-400 mt-2">またはクリックしてファイルを選択 (最大5MB)</p>
                       </div>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                        onChange={(e) => e.target.files && setUploadFile(e.target.files[0])} />
                 </div>
                 
                 <button 
                    disabled={!uploadFile}
                    onClick={handleFileUpload}
                    className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    <span>🤖</span> AIで読み込み開始
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 確認モーダル & AIモーダル */}
      {isConfirmModalOpen && targetPackageForModal && editingProfile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div><h3 className="text-2xl font-bold text-slate-800">Review & Start</h3></div>
              <button onClick={() => setIsConfirmModalOpen(false)} className="text-2xl text-slate-300 hover:text-slate-600">×</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
               <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Target Package</div>
                  <div className="text-xl font-bold text-slate-800">{targetPackageForModal.name} <span className="text-sm font-normal text-slate-500 ml-2">({targetPackageForModal.totalCountMaster} companies)</span></div>
               </div>
               
               <div className={`p-6 rounded-xl border transition-all ${isEditingInModal ? 'border-orange-200 ring-1 ring-orange-100 bg-orange-50/30' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-6">
                     <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Message Content</div>
                     <div className="flex gap-2">
                        {!isEditingInModal ? (
                           <>
                             <button onClick={handleStartEditInModal} className="text-xs font-bold px-4 py-2 rounded bg-slate-100 hover:bg-slate-200">編集</button>
                             <button onClick={handleDuplicateAndEdit} className="text-xs font-bold px-4 py-2 rounded bg-slate-100 hover:bg-slate-200">複製して編集</button>
                           </>
                        ) : (
                           <button onClick={() => handleSaveEditInModal(false)} disabled={isSavingProfile} className="text-xs font-bold px-4 py-2 rounded bg-slate-800 text-white">保存</button>
                        )}
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase">管理ネーム</label><input disabled={!isEditingInModal} className="w-full p-2 border rounded text-sm" value={editingProfile.profile_name} onChange={e=>setEditingProfile({...editingProfile, profile_name:e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase">企業URL</label><input disabled={!isEditingInModal} className="w-full p-2 border rounded text-sm" value={editingProfile.sender_url} onChange={e=>setEditingProfile({...editingProfile, sender_url:e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                       <div><label className="block text-xs font-bold text-slate-500 uppercase">会社名</label><input disabled={!isEditingInModal} className="w-full p-2 border rounded text-sm" value={editingProfile.sender_company} onChange={e=>setEditingProfile({...editingProfile, sender_company:e.target.value})} /></div>
                       <div><label className="block text-xs font-bold text-slate-500 uppercase">部署名</label><input disabled={!isEditingInModal} className="w-full p-2 border rounded text-sm" value={editingProfile.sender_department} onChange={e=>setEditingProfile({...editingProfile, sender_department:e.target.value})} /></div>
                       <div><label className="block text-xs font-bold text-slate-500 uppercase">電話番号</label><input disabled={!isEditingInModal} className="w-full p-2 border rounded text-sm" value={editingProfile.phone_number} onChange={e=>setEditingProfile({...editingProfile, phone_number:e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                       <div><label className="block text-xs font-bold text-slate-500 uppercase">姓</label><input disabled={!isEditingInModal} className="w-full p-2 border rounded text-sm" value={editingProfile.sender_last_name} onChange={e=>setEditingProfile({...editingProfile, sender_last_name:e.target.value})} /></div>
                       <div><label className="block text-xs font-bold text-slate-500 uppercase">名</label><input disabled={!isEditingInModal} className="w-full p-2 border rounded text-sm" value={editingProfile.sender_first_name} onChange={e=>setEditingProfile({...editingProfile, sender_first_name:e.target.value})} /></div>
                       <div><label className="block text-xs font-bold text-slate-500 uppercase">Email</label><input disabled={!isEditingInModal} className="w-full p-2 border rounded text-sm" value={editingProfile.sender_email} onChange={e=>setEditingProfile({...editingProfile, sender_email:e.target.value})} /></div>
                    </div>
                    <hr className="border-slate-200" />
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">件名</label>
                        <input disabled={!isEditingInModal} className="w-full p-2 border rounded font-bold text-sm" value={editingProfile.subject_title} onChange={e=>setEditingProfile({...editingProfile, subject_title:e.target.value})} />
                    </div>
                     <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">本文</label>
                        <button onClick={handleOpenRewriteModal} className="absolute right-0 top-0 text-xs font-bold text-white bg-indigo-600 px-3 py-1 rounded-full shadow hover:bg-indigo-500 transition flex items-center gap-1 z-10">✨ AI Generate</button>
                        <textarea disabled={!isEditingInModal} rows={10} className="w-full p-4 border rounded text-sm leading-relaxed" value={editingProfile.message_body} onChange={e=>setEditingProfile({...editingProfile, message_body:e.target.value})} />
                     </div>
                  </div>
               </div>
            </div>
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 shrink-0">
               <button onClick={() => setIsConfirmModalOpen(false)} className="px-6 py-2 font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition">Cancel</button>
               {isEditingInModal ? 
                  <button onClick={() => handleSaveEditInModal(true)} className="px-8 py-3 font-bold text-white bg-orange-500 rounded-xl shadow-lg hover:shadow-orange-500/30 transition">保存して進む</button> :
                  <button onClick={handleConfirmAndRun} className="px-8 py-3 font-bold text-white bg-indigo-600 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition">確定して送信開始</button>
               }
            </div>
          </div>
        </div>
      )}

      {/* AI リライトモーダル */}
      {isRewriteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col relative overflow-hidden">
              {isAiGenerating && (
                <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center text-cyan-400 font-mono overflow-hidden">
                   <div className="absolute inset-0 opacity-20 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/20 to-transparent animate-scanline h-[200%] w-full top-[-100%]"></div>
                   <div className="relative w-40 h-40 mb-10">
                      <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-[spin_3s_linear_infinite] shadow-[0_0_20px_rgba(6,182,212,0.6)]"></div>
                      <div className="absolute inset-4 border-4 border-purple-500/30 rounded-full animate-[spin_2s_linear_infinite_reverse] shadow-[0_0_20px_rgba(168,85,247,0.6)]"></div>
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-5xl font-black animate-pulse bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.9)]">AI</span></div>
                   </div>
                   <div className="text-xl tracking-[0.2em] font-bold animate-glitch">{loadingText}</div>
                   <div className="w-80 h-3 bg-slate-800 rounded-full mt-8 overflow-hidden relative border border-cyan-900/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                      <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-200 ease-out relative" style={{ width: `${progress}%` }}><div className="absolute inset-0 bg-white/40 animate-[shimmer_1s_infinite]"></div></div>
                   </div>
                   <div className="mt-3 text-sm font-bold font-mono">{progress.toFixed(0)}% COMPLETE</div>
                   <div className="mt-8 text-xs text-cyan-700 opacity-70 tracking-wider">DO NOT CLOSE THE WINDOW</div>
                </div>
              )}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                 <h4 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">✨</span> AI Writer</h4>
                 <button onClick={handleCloseRewriteModal} className="text-2xl text-slate-300">×</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                 {rewriteStep === 'input' ? (
                    <div className="space-y-4">
                       <p className="text-sm text-slate-500 mb-4">高品質なコールドメールを生成するために、以下の情報を入力してください。</p>
                       <input className="w-full p-3 border rounded-lg text-sm" placeholder="商材名" value={rewriteInputs.productName} onChange={e=>setRewriteInputs({...rewriteInputs, productName:e.target.value})} />
                       <input className="w-full p-3 border rounded-lg text-sm" placeholder="URL" value={rewriteInputs.productUrl} onChange={e=>setRewriteInputs({...rewriteInputs, productUrl:e.target.value})} />
                       <input className="w-full p-3 border rounded-lg text-sm" placeholder="ターゲット" value={rewriteInputs.targetType} onChange={e=>setRewriteInputs({...rewriteInputs, targetType:e.target.value})} />
                       <input className="w-full p-3 border rounded-lg text-sm" placeholder="価値" value={rewriteInputs.coreValue} onChange={e=>setRewriteInputs({...rewriteInputs, coreValue:e.target.value})} />
                       <input className="w-full p-3 border rounded-lg text-sm" placeholder="ゴール" value={rewriteInputs.goal} onChange={e=>setRewriteInputs({...rewriteInputs, goal:e.target.value})} />
                    </div>
                 ) : (
                    <div className="h-full flex flex-col">
                       <textarea className="flex-1 p-4 border rounded-lg text-sm leading-relaxed resize-none focus:ring-2 focus:ring-indigo-500 outline-none font-mono" value={generatedBody} onChange={e=>setGeneratedBody(e.target.value)} />
                       <div className="mt-4 flex gap-2">
                          <input className="flex-1 p-2 border rounded text-sm" placeholder="修正指示..." value={refineInstruction} onChange={e=>setRefineInstruction(e.target.value)} />
                          <button onClick={()=>runAiGenerate('refine')} className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold">修正</button>
                       </div>
                       <div className="text-right mt-2"><button onClick={handleStartNewAi} className="text-xs text-indigo-600 hover:underline">新規作成に戻る</button></div>
                    </div>
                 )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                 {rewriteStep === 'input' ? 
                    <button onClick={()=>runAiGenerate('draft')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition">生成する</button> :
                    <button onClick={handleApplyGeneratedText} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-emerald-500/30 transition">適用する</button>
                 }
              </div>
           </div>
        </div>
      )}
      <style jsx global>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } } .animate-shimmer { animation: shimmer 2s infinite; } @keyframes scanline { 0% { transform: translateY(0); } 100% { transform: translateY(50%); } } .animate-scanline { animation: scanline 4s linear infinite; } @keyframes glitch { 0% { opacity: 1; transform: translateX(0); } 2% { opacity: 0.8; transform: translateX(2px); } 4% { opacity: 1; transform: translateX(0); } } .animate-glitch { animation: glitch 1s infinite alternate; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeInUp { animation: fadeInUp 0.5s ease-out; }`}</style>
    </div>
  );
}