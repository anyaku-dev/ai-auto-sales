import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Vercelでのタイムアウト設定（AI分析は時間がかかるため）
export const maxDuration = 60; 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Vercelの環境変数を参照（安全！）
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { htmlContent } = body;

    if (!htmlContent) {
      return NextResponse.json({ error: 'HTML Content is required' }, { status: 400 });
    }

    // AIへの指示（worker.tsから移植）
    const prompt = `
    あなたはHTMLフォームの分析官です。
    以下のHTMLから、お問い合わせフォームの入力フィールドを特定し、
    Playwrightで操作可能なCSSセレクタをJSON形式で返してください。
    
    必要なフィールド:
    - company_name (会社名)
    - person_name (担当者名 - 氏名が1つの場合)
    - last_name (姓)
    - first_name (名)
    - email (メールアドレス)
    - phone_number (電話番号)
    - department_name (部署名)
    - subject_title (件名)
    - body (本文/問い合わせ内容)
    - company_url (会社URL/Webサイト)
    - agreement_checkbox (プライバシーポリシー同意等のチェックボックス)
    - confirm_button (確認画面へ進むボタン)
    - submit_button (送信ボタン)

    HTML:
    ${htmlContent.substring(0, 15000)}

    回答はJSONのみ返してください。
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return NextResponse.json(result);

  } catch (e: any) {
    console.error('AI Analysis Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}