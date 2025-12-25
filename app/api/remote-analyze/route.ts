import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export const maxDuration = 60; 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { htmlContent } = body;

    if (!htmlContent) return NextResponse.json({ error: 'No content' }, { status: 400 });

    const prompt = `
    以下のHTMLから、お問い合わせフォームの入力フィールドを特定し、
    Playwrightで操作可能なCSSセレクタをJSON形式で返してください。
    
    必要なフィールド:
    company_name, person_name, last_name, first_name, email, phone_number,
    department_name, subject_title, body, company_url, agreement_checkbox,
    confirm_button, submit_button

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