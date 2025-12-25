import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
// ★変更点: node-html-parser を使用
import { parse } from 'node-html-parser';

export const maxDuration = 60; 
// Vercelでの動的実行を強制
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { htmlContent } = body;

    if (!htmlContent) return NextResponse.json({ error: 'No content' }, { status: 400 });

    // --- 【改善点】HTMLのダイエット処理 (node-html-parser版) ---
    try {
      // HTMLをパース（解析）
      const root = parse(htmlContent);

      // 不要なタグを一括削除
      const tagsToRemove = ['script', 'style', 'svg', 'noscript', 'iframe', 'link', 'meta', 'header', 'footer'];
      tagsToRemove.forEach(tag => {
        const elements = root.querySelectorAll(tag);
        elements.forEach(el => el.remove());
      });

      // HTMLを取得（bodyがあればbodyの中身、なければ全体）
      const bodyEl = root.querySelector('body');
      if (bodyEl) {
        htmlContent = bodyEl.innerHTML;
      } else {
        htmlContent = root.innerHTML;
      }
    } catch (e) {
      console.log("HTML parsing error, using raw content");
    }

    // 文字数制限（10万文字あれば十分です）
    const truncatedHtml = htmlContent.substring(0, 100000);

    const prompt = `
    あなたはHTML解析のプロです。
    提供されたHTMLから、お問い合わせフォームの入力要素に対応するCSSセレクタを特定してください。
    
    必ずHTML内に【実在する】属性（id, name, classなど）を使用してください。
    推測で一般的なID（#emailなど）を回答しないでください。
    見つからない場合は null を返してください。

    必要なフィールド:
    company_name, person_name, last_name, first_name, email, phone_number,
    department_name, subject_title, body, company_url, agreement_checkbox,
    confirm_button, submit_button

    HTML:
    ${truncatedHtml}

    回答形式（JSONのみ）:
    { "company_name": "...", "email": null, ... }
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