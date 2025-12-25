// 実行部隊（Local Worker） - 対話型ログイン版
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import playwright from 'playwright';
import readline from 'readline'; // 入力受け付け用

// AI設定読み込み
const { analyzeForm } = require('./lib/ai-analyzer');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ユーザーに入力を求めるための設定
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 質問して答えを待つ関数
const askQuestion = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function processQueue() {
  console.log('🤖 Worker starting...');

  // ★★★ ここでログイン情報を入力させます ★★★
  console.log('\n--- ログインしてください ---');
  const email = await askQuestion('Email: ');
  const password = await askQuestion('Password: ');
  rl.close(); // 入力終了

  console.log('\nLogging in...');

  // 入力された情報でSupabaseにログイン
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !user) {
    console.error('❌ Login Failed:', authError?.message);
    console.error('SupabaseのAuthenticationメニューでユーザーを作成してください。');
    process.exit(1);
  }

  // ★自動でIDを特定！
  const OWNER_ID = user.id;
  console.log(`✅ Login Successful!`);
  console.log(`🔑 Owner ID identified: ${OWNER_ID}`);
  console.log('Waiting for jobs...\n');

  while (true) {
    try {
      // 特定したIDでタスクを探す
      const { data: target, error } = await supabase
        .from('targets')
        .select('*')
        .eq('status', 'pending')
        .eq('owner_id', OWNER_ID) 
        .limit(1)
        .single();

      if (!target) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      console.log(`🚀 Processing: ${target.company_name} (${target.url})`);

      await supabase.from('targets').update({ status: 'processing' }).eq('id', target.id);

      const { data: profile } = await supabase
        .from('sender_profiles')
        .select('*')
        .eq('owner_id', OWNER_ID)
        .single();

      if (!profile) throw new Error('Profile not found');

      const browser = await playwright.chromium.launch({
        headless: false,
        channel: 'chrome',
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(target.url, { timeout: 30000, waitUntil: 'domcontentloaded' });
        const content = await page.content();
        const selectors = await analyzeForm(content);

        // --- 入力処理 ---
        if (selectors.company_name) await page.fill(selectors.company_name, profile.sender_company || '個人').catch(()=>null);
        
        const lastName = profile.sender_last_name || '';
        const firstName = profile.sender_first_name || '';
        let nameDone = false;
        
        if (selectors.last_name) { await page.fill(selectors.last_name, lastName).catch(()=>null); nameDone = true; }
        if (selectors.first_name) { await page.fill(selectors.first_name, firstName).catch(()=>null); nameDone = true; }
        if (!nameDone && selectors.person_name) {
           await page.fill(selectors.person_name, `${lastName} ${firstName}`).catch(()=>null);
        }

        if (selectors.email) await page.fill(selectors.email, profile.sender_email).catch(()=>null);
        if (selectors.phone_number) await page.fill(selectors.phone_number, profile.phone_number).catch(()=>null);
        if (selectors.subject_title) await page.fill(selectors.subject_title, profile.subject_title).catch(()=>null);
        if (selectors.body) await page.fill(selectors.body, profile.message_body).catch(()=>null);

        if (selectors.agreement_checkbox) {
            await page.check(selectors.agreement_checkbox).catch(async () => {
              await page.click(selectors.agreement_checkbox).catch(()=>null);
            });
        }

        if (selectors.submit_button) {
          await Promise.all([
             page.waitForLoadState('networkidle').catch(()=>{}),
             page.click(selectors.submit_button)
          ]);
          await page.waitForTimeout(5000);
        }

        console.log('✅ Sent successfully');
        
        await supabase.from('targets').update({ 
          status: 'completed', 
          result_log: 'Sent by Local Worker' 
        }).eq('id', target.id);

      } catch (e: any) {
        console.error('❌ Error:', e.message);
        await supabase.from('targets').update({ 
          status: 'error', 
          result_log: e.message 
        }).eq('id', target.id);
      } finally {
        await browser.close();
      }

    } catch (e) {
      console.error('System Error:', e);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

processQueue();