// app/api/analyze-url/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// タイムアウトを長めに設定
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });

    // GPT-4o-mini でコストを抑えつつ分析
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "あなたはB2Bマーケティングの専門家です。提供されたURLの企業がターゲットとすべき業界や、その企業自身の属する業界を分析し、関連性の高いタグをカンマ区切りで5〜10個抽出してください。出力はタグのみ（例: IT, SaaS, 建設DX, マーケティング支援）としてください。" },
        { role: "user", content: `分析対象URL: ${url}` }
      ],
      temperature: 0.3, // 安定した出力を求めるため低めに
    });

    const tags = completion.choices[0].message.content || '';
    return NextResponse.json({ tags });

  } catch (e: any) {
    console.error("Analyze URL Error:", e);
    // エラー時は空文字を返して処理を止めない
    return NextResponse.json({ tags: '' });
  }
}