// 実行部隊（Local Worker） - リモコン待受モード
import dotenv from 'dotenv';
// 設定読み込み
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import playwright from 'playwright';
import readline from 'readline';

// AI設定読み込み（ts-nodeでの実行エラー回避のため require を使用）
const { analyzeForm } = require('./lib/ai-analyzer');

// クライアント作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ユーザーに入力を求めるための設定
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function processQueue() {
  console.log('🤖 Local Worker Starting (Remote Control Mode)...');
  console.log('Vercel環境のデータベースに接続してタスクを待ち受けます。');

  // --- 1. ログイン処理 ---
  console.log('\n--- ログインしてください（ダッシュボードと同じ情報） ---');
  const email = await askQuestion('Email: ');
  const password = await askQuestion('Password: ');
  rl.close(); // 入力終了

  console.log('\nConnecting to Supabase...');

  // 認証実行
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !user) {
    console.error('❌ Login Failed:', authError?.message);
    console.error('メールアドレスまたはパスワードが間違っています。');
    process.exit(1);
  }

  // IDの特定
  const OWNER_ID = user.id;
  console.log(`✅ Login Successful!`);
  console.log(`🔑 Operating as User ID: ${OWNER_ID}`);
  // ★変更点：pendingではなくqueuedを探すとログで明示
  console.log('Waiting for "queued" jobs (Click "Send" on Dashboard)... \n');

  // --- 2. 監視ループ開始 ---
  while (true) {
    try {
      // 自分のID宛のタスクを取得
      // ★変更点：ここを 'pending' から 'queued' に変更しました
      // これにより、Web側でボタンが押されたものだけを処理します
      const { data: target, error } = await supabase
        .from('targets')
        .select('*')
        .eq('status', 'queued') 
        .eq('owner_id', OWNER_ID) // 特定したIDでフィルタリング
        .limit(1)
        .single();

      if (!target) {
        // 仕事がなければ3秒待機して再確認
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      console.log(`🚀 Start Job: ${target.company_name} (${target.url})`);

      // ステータスを「処理中」に変更
      await supabase.from('targets').update({ status: 'processing' }).eq('id', target.id);

      // プロフィール情報の取得
      const { data: profile } = await supabase
        .from('sender_profiles')
        .select('*')
        .eq('owner_id', OWNER_ID)
        .single();

      if (!profile) throw new Error('Profile not found: プロフィール設定を確認してください');

      // --- 3. ブラウザ起動（PCのChromeを使用） ---
      const browser = await playwright.chromium.launch({
        headless: false, // 画面を表示する
        channel: 'chrome', // PCにインストールされているChromeを使う
        args: ['--start-maximized'] // 最大化して開く
      });

      const context = await browser.newContext({
        viewport: null, // ウィンドウサイズに合わせる
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      });
      
      const page = await context.newPage();

      try {
        console.log('Opening page...');
        await page.goto(target.url, { timeout: 30000, waitUntil: 'domcontentloaded' });
        
        // AI分析実行
        console.log('Analyzing form with AI...');
        const content = await page.content();
        const selectors = await analyzeForm(content);
        console.log('Selectors found:', selectors);

        // --- 4. 入力実行 ---
        
        // 会社名
        if (selectors.company_name) {
           const val = profile.sender_company || target.company_name || '個人';
           await page.fill(selectors.company_name, val).catch(()=>null);
        }

        // 氏名
        const lastName = profile.sender_last_name || '';
        const firstName = profile.sender_first_name || '';
        let nameDone = false;

        if (selectors.last_name) {
          await page.fill(selectors.last_name, lastName).catch(()=>null);
          nameDone = true;
        }
        if (selectors.first_name) {
          await page.fill(selectors.first_name, firstName).catch(()=>null);
          nameDone = true;
        }
        if (!nameDone && selectors.person_name) {
          await page.fill(selectors.person_name, `${lastName} ${firstName}`).catch(()=>null);
        }

        // その他項目
        if (selectors.department_name && profile.sender_department) await page.fill(selectors.department_name, profile.sender_department).catch(()=>null);
        if (selectors.email && profile.sender_email) await page.fill(selectors.email, profile.sender_email).catch(()=>null);
        if (selectors.phone_number && profile.phone_number) await page.fill(selectors.phone_number, profile.phone_number).catch(()=>null);
        if (selectors.company_url && profile.sender_url) await page.fill(selectors.company_url, profile.sender_url).catch(()=>null);
        if (selectors.subject_title && profile.subject_title) await page.fill(selectors.subject_title, profile.subject_title).catch(()=>null);
        if (selectors.body && profile.message_body) await page.fill(selectors.body, profile.message_body).catch(()=>null);

        // 同意チェック
        if (selectors.agreement_checkbox) {
          await page.check(selectors.agreement_checkbox).catch(async () => {
            await page.click(selectors.agreement_checkbox).catch(()=>null);
          });
        }

        await page.waitForTimeout(1000);

        // --- 5. 送信・確認ボタン処理 ---
        let submitted = false;

        // パターンA: 確認画面がある場合
        if (selectors.confirm_button) {
           console.log("Clicking confirm button...");
           await page.click(selectors.confirm_button);
           await page.waitForTimeout(3000); 
           await page.waitForLoadState('domcontentloaded').catch(()=>null);

           // 確認画面で「送信」を探す
           const finalSubmitBtn = page.getByRole('button', { name: /送信|完了|Send|Submit|申|込/i }).first();
           if (await finalSubmitBtn.isVisible().catch(()=>false)) {
              console.log("Clicking final submit button...");
              await Promise.all([
                page.waitForLoadState('networkidle').catch(() => {}),
                finalSubmitBtn.click(),
              ]);
              submitted = true;
           } else if (selectors.submit_button) {
              // 見つからなければ元のボタンを再試行
              await page.click(selectors.submit_button).catch(()=>null);
              submitted = true;
           }
        } 
        // パターンB: 直接送信
        else if (selectors.submit_button) {
           console.log("Clicking submit button...");
           await Promise.all([
             page.waitForLoadState('networkidle').catch(() => {}),
             page.click(selectors.submit_button),
           ]);
           
           // 再確認ボタンのケア
           await page.waitForTimeout(2000);
           const confirmBtnAgain = page.getByRole('button', { name: /送信|完了|Send|Submit|OK/i }).first();
           if (await confirmBtnAgain.isVisible().catch(()=>false)) {
              await confirmBtnAgain.click().catch(()=>null);
           }
           submitted = true;
        }

        if (submitted) {
           console.log("Waiting for submission to complete...");
           await page.waitForTimeout(5000); // 完了まで少し待つ
        }

        console.log('✅ Task Completed Successfully');
        
        // 完了ステータスに更新
        await supabase.from('targets').update({ 
          status: 'completed', 
          result_log: JSON.stringify({ message: 'Sent by Local Worker', date: new Date().toISOString() }),
          completed_at: new Date().toISOString()
        }).eq('id', target.id);

      } catch (e: any) {
        console.error('❌ Error during execution:', e.message);
        await supabase.from('targets').update({ 
          status: 'error', 
          result_log: e.message 
        }).eq('id', target.id);
      } finally {
        // ブラウザを閉じる
        await browser.close();
      }

    } catch (e) {
      console.error('System Error (Retrying in 5s):', e);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

processQueue();