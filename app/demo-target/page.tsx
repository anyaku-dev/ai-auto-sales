'use client';

import { useState } from 'react';

export default function DemoTargetPage() {
  const [step, setStep] = useState<'input' | 'confirm' | 'complete'>('input');
  const [formData, setFormData] = useState({
    company_name: '',
    name: '',
    email: '',
    tel: '',
    category: 'service',
    subject: '',
    body: '',
    agreement: false
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleConfirm = (e: any) => {
    e.preventDefault();
    if (!formData.agreement) {
      alert('個人情報の取り扱いに同意してください');
      return;
    }
    setStep('confirm');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep('input');
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    // 擬似的な送信処理（1秒待機）
    await new Promise(r => setTimeout(r, 1000));
    setStep('complete');
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* 架空のヘッダー */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div className="font-bold text-xl text-blue-900">株式会社デモ・コーポレーション</div>
          <nav className="text-sm text-gray-500 space-x-4">
            <span>会社概要</span>
            <span>事業内容</span>
            <span>採用情報</span>
            <span className="text-blue-600 font-bold">お問い合わせ</span>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12">
          
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold mb-2">お問い合わせフォーム（デモ用）</h1>
            <p className="text-sm text-gray-500">
              これは営業ロボットの動作テスト専用の架空フォームです。<br/>
              実際にはどこにも送信されませんので、ご自由に入力テストを行ってください。
            </p>
          </div>

          {/* ステップバー */}
          <div className="flex items-center justify-center mb-10 text-sm font-bold">
            <div className={`px-4 py-2 rounded-full ${step === 'input' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>1. 入力</div>
            <div className="w-8 h-0.5 bg-gray-200 mx-2"></div>
            <div className={`px-4 py-2 rounded-full ${step === 'confirm' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>2. 確認</div>
            <div className="w-8 h-0.5 bg-gray-200 mx-2"></div>
            <div className={`px-4 py-2 rounded-full ${step === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>3. 完了</div>
          </div>

          {step === 'input' && (
            <form onSubmit={handleConfirm} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">会社名 <span className="text-red-500">*</span></label>
                  <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例: 株式会社デモ" required />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">お名前 <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例: 山田 太郎" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">メールアドレス <span className="text-red-500">*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例: demo@example.com" required />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">電話番号</label>
                  <input type="tel" name="tel" value={formData.tel} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例: 03-1234-5678" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">お問い合わせ種別</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="service">サービスについて</option>
                  <option value="recruit">採用について</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">件名 <span className="text-red-500">*</span></label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="件名を入力してください" required />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">お問い合わせ内容 <span className="text-red-500">*</span></label>
                <textarea name="body" value={formData.body} onChange={handleChange} rows={6} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ここにお問い合わせ内容を入力してください" required></textarea>
              </div>

              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="agreement" checked={formData.agreement} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="text-sm">個人情報の取り扱いに同意する</span>
                </label>
              </div>

              <div className="text-center pt-4">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-transform hover:scale-105">
                  確認画面へ進む
                </button>
              </div>
            </form>
          )}

          {step === 'confirm' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <div className="text-xs text-gray-500 mb-1">会社名</div>
                  <div className="font-bold">{formData.company_name}</div>
                </div>
                <div className="border-b pb-4">
                  <div className="text-xs text-gray-500 mb-1">お名前</div>
                  <div className="font-bold">{formData.name}</div>
                </div>
                <div className="border-b pb-4">
                  <div className="text-xs text-gray-500 mb-1">メールアドレス</div>
                  <div className="font-bold">{formData.email}</div>
                </div>
                <div className="border-b pb-4">
                  <div className="text-xs text-gray-500 mb-1">件名</div>
                  <div className="font-bold">{formData.subject}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap text-sm leading-relaxed">
                  {formData.body}
                </div>
              </div>

              <div className="flex flex-col-reverse md:flex-row gap-4 justify-center pt-4">
                <button onClick={handleBack} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-8 rounded-full transition">
                  戻る
                </button>
                <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-full shadow-lg transition-transform hover:scale-105">
                  この内容で送信する
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-10 animate-fadeIn">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">送信が完了しました</h2>
              <p className="text-gray-500 mb-8">
                お問い合わせありがとうございました。<br/>
                （※これはデモであり、実際には送信されていません）
              </p>
              <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">
                フォームに戻る
              </button>
            </div>
          )}

        </div>
      </main>
      
      <footer className="bg-gray-800 text-white py-8 text-center text-sm">
        <p>&copy; 2025 Demo Corporation. All rights reserved.</p>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}