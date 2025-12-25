import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { parse } from 'node-html-parser';

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { htmlContent } = body;

    if (!htmlContent) return NextResponse.json({ error: 'No content' }, { status: 400 });

    // --- HTMLのダイエット処理 ---
    try {
      const root = parse(htmlContent);

      const tagsToRemove = ['script', 'style', 'svg', 'noscript', 'iframe', 'link', 'meta', 'header', 'footer'];
      tagsToRemove.forEach(tag => {
        const elements = root.querySelectorAll(tag);
        elements.forEach(el => el.remove());
      });

      const bodyEl = root.querySelector('body');
      if (bodyEl) {
        htmlContent = bodyEl.innerHTML;
      } else {
        htmlContent = root.innerHTML;
      }
    } catch (e) {
      console.log("HTML parsing error, using raw content");
    }

    const truncatedHtml = htmlContent.substring(0, 100000);

    // ★修正ポイント：お問い合わせ種別の判別ロジックを追加
    const prompt = `
    あなたはHTML解析のプロです。
    提供されたHTMLから、お問い合わせフォームの入力要素に対応するCSSセレクタを特定してください。
    
    特に「お問い合わせ種別（Category/Type）」がある場合、
    「業務提携」「法人」「ビジネス」「その他」など、営業提案として最も適切な選択肢を選んでください。

    【ルール】
    1. 必ずHTML内に【実在する】属性（id, name, classなど）を使用してください。
    2. 推測で一般的なIDを回答しないでください。
    3. 見つからない場合は null を返してください。

    【お問い合わせ種別（inquiry_category）の特別ルール】
    - プルダウン(<select>)の場合: selectorに<select>タグのセレクタ、valueに選択すべき<option>のvalue属性値を入れてください。
    - ラジオボタン(<input type="radio">)の場合: selectorに「クリックすべき特定の<input>」のセレクタを入れてください（valueはnullでOK）。

    必要なフィールド:
    company_name, person_name, last_name, first_name, email, phone_number,
    department_name, subject_title, body, company_url, agreement_checkbox,
    confirm_button, submit_button,
    inquiry_category_selector, inquiry_category_value

    HTML:
    ${truncatedHtml}

    回答形式（JSONのみ）:
    { 
      "company_name": "...", 
      "inquiry_category_selector": "select[name='type']",
      "inquiry_category_value": "business_partnership", 
      ... 
    }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return NextResponse.json(result);

  } catch (e: any) {
    console.error('AI Analysis Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}