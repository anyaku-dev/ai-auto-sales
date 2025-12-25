import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';
import { analyzeForm } from '../../../lib/ai-analyzer';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  let target = null;
  let browser = null;

  try {
    const body = await req.json();
    const { sender_profile_id, target_package_name, owner_id } = body;

    if (!sender_profile_id || !owner_id) {
      return NextResponse.json({ message: '認証エラー: IDが不足しています' }, { status: 400 });
    }

    // 1. ターゲット取得 (自分のデータのみ)
    let query = supabase.from('targets')
      .select('*')
      .eq('status', 'pending')
      .eq('owner_id', owner_id);

    if (target_package_name) query = query.eq('package_name', target_package_name);
    
    const { data, error } = await query.limit(1).single();
    target = data;

    if (error || !target) return NextResponse.json({ message: 'No jobs found' });

    // 2. プロフィール取得
    const { data: profile } = await supabase
      .from('sender_profiles')
      .select('*')
      .eq('id', sender_profile_id)
      .eq('owner_id', owner_id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });

    await supabase.from('targets').update({ status: 'processing' }).eq('id', target.id);

    const MAX_RETRIES = 3;
    let success = false;
    let lastError = '';
    let resultLog = {};

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`Attempt ${attempt}/${MAX_RETRIES}: ${target.url}`);
      
      try {
        const isProduction = process.env.NODE_ENV === "production";
        browser = await playwright.chromium.launch({
          args: isProduction ? chromium.args : [],
          executablePath: isProduction 
            ? await chromium.executablePath() 
            : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          headless: isProduction ? true : false, 
        });

        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        
        // タイムアウトを少し長めに設定
        await page.goto(target.url, { timeout: 25000, waitUntil: 'domcontentloaded' });

        const content = await page.content();
        const selectors = await analyzeForm(content);
        console.log("Selectors:", selectors);
        
        // --- 入力実行 ---
        
        // 会社名
        if (selectors.company_name) {
           const val = profile.sender_company || target.company_name || '個人';
           await page.fill(selectors.company_name, val).catch(()=>null);
        }

        // 氏名入力ロジック（最新のAnalyzerの指示に従う）
        const lastName = profile.sender_last_name || '';
        const firstName = profile.sender_first_name || '';
        let nameDone = false;

        // 1. 分割入力（最優先）
        if (selectors.last_name) {
          await page.fill(selectors.last_name, lastName).catch(()=>null);
          nameDone = true;
        }
        if (selectors.first_name) {
          await page.fill(selectors.first_name, firstName).catch(()=>null);
          nameDone = true;
        }

        // 2. 結合入力（保険：Analyzerがperson_nameしか返さなかった場合）
        if (!nameDone && selectors.person_name) {
          const fullName = `${lastName} ${firstName}`.trim(); 
          await page.fill(selectors.person_name, fullName).catch(()=>null);
        }

        // その他項目
        if (selectors.department_name && profile.sender_department) {
           await page.fill(selectors.department_name, profile.sender_department).catch(()=>null);
        }
        if (selectors.phone_number && profile.phone_number) await page.fill(selectors.phone_number, profile.phone_number).catch(()=>null);
        if (selectors.email && profile.sender_email) await page.fill(selectors.email, profile.sender_email).catch(()=>null);
        if (selectors.company_url && profile.sender_url) {
           await page.fill(selectors.company_url, profile.sender_url).catch(()=>null);
        }
        if (selectors.subject_title && profile.subject_title) {
           await page.fill(selectors.subject_title, profile.subject_title).catch(()=>null);
        }
        if (selectors.body && profile.message_body) await page.fill(selectors.body, profile.message_body).catch(()=>null);

        // 同意チェック
        if (selectors.agreement_checkbox) {
          await page.check(selectors.agreement_checkbox).catch(async () => {
            await page.click(selectors.agreement_checkbox).catch(()=>null);
          });
        }

        await page.waitForTimeout(1500);

        // ★★★ 2段階送信ロジック（ここが核心） ★★★
        let clickedFinalSubmit = false;

        // パターンA: 「確認画面へ」ボタンがある場合
        if (selectors.confirm_button) {
           console.log("Confirm button found, clicking...");
           await page.click(selectors.confirm_button);
           
           // 確認画面への遷移待ち
           await page.waitForTimeout(3000); 
           await page.waitForLoadState('domcontentloaded').catch(()=>null);

           // 確認画面で「送信」ボタンを探す（AI分析ではなく、確実なキーワード検索で捉える）
           const finalSubmitBtn = page.getByRole('button', { name: /送信|完了|Send|Submit|申|込/i }).first();
           
           if (await finalSubmitBtn.isVisible().catch(()=>false)) {
              console.log("Final submit button found on confirm page, clicking...");
              await finalSubmitBtn.click();
              clickedFinalSubmit = true;
           } else {
              // ボタンが見つからない場合、念の為元のsubmit_buttonセレクタを再試行
              if (selectors.submit_button) {
                 await page.click(selectors.submit_button).catch(()=>null);
                 clickedFinalSubmit = true;
              }
           }
        } 
        // パターンB: 「送信」ボタンしかない場合（確認画面なし、またはAIがsubmitと判定）
        else if (selectors.submit_button) {
           console.log("Submit button found, clicking...");
           await page.click(selectors.submit_button);
           
           // ★念のための2段構え★
           // もし「送信」を押した後に確認モーダルなどが出て、もう一度「送信」が必要なケースへの対応
           await page.waitForTimeout(3000);
           const confirmBtnAgain = page.getByRole('button', { name: /送信|完了|Send|Submit|OK/i }).first();
           if (await confirmBtnAgain.isVisible().catch(()=>false)) {
              console.log("Double check confirm button found, clicking...");
              await confirmBtnAgain.click().catch(()=>null);
           }
           clickedFinalSubmit = true;
        }

        if (clickedFinalSubmit) {
           await page.waitForTimeout(5000); // 送信完了待ち
        }

        success = true;
        resultLog = { selectors, used_profile: profile.profile_name, attempts: attempt };
        await browser.close();
        break; 

      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        lastError = err.message;
        if (browser) await browser.close();
      }
    }

    if (success) {
      // 成功処理
      await supabase.from('targets').update({ 
        status: 'completed', 
        result_log: JSON.stringify(resultLog),
        completed_at: new Date().toISOString()
      }).eq('id', target.id);

      return NextResponse.json({ success: true, target_url: target.url, profile_used: profile.profile_name });
    } else {
      await supabase.from('targets').update({ 
        status: 'error', 
        result_log: `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError}` 
      }).eq('id', target.id);
      return NextResponse.json({ success: false, error: lastError });
    }

  } catch (e: any) {
    if (target) {
        await supabase.from('targets').update({ status: 'error', result_log: e.message }).eq('id', target.id);
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}