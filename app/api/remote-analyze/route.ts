import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { JSDOM } from 'jsdom';

// タイムアウトを最大に
export const maxDuration = 60; 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { htmlContent } = body;

    if (!htmlContent) return NextResponse.json({ error: 'No content' }, { status: 400 });

    // --- 【改善点】HTMLのダイエット処理 ---
    // scriptやstyleタグはAI分析に不要なので削除して、容量を空ける
    try {
      const dom = new JSDOM(htmlContent);
      const doc = dom.window.document;
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(script => script.remove());
      const styles = doc.querySelectorAll('style');
      styles.forEach(style => style.remove());
      const svgs = doc.querySelectorAll('svg');
      svgs.forEach(svg => svg.remove());
      
      // 整形後のHTMLを取得
      htmlContent = doc.body.innerHTML;
    } catch (e) {
      console.log("HTML parsing error, using raw content");
    }

    // --- 【改善点】文字数制限を大幅緩和 ---
    // 15,000 -> 100,000文字へ拡大（これでフォームまで届きます）
    // ※VercelのPayload制限（4.5MB）には十分収まります
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