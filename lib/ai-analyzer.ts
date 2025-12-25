import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeForm(htmlBody: string) {
  let cleanHtml = htmlBody;
  
  // 余計なタグを除去してHTMLを軽量化
  cleanHtml = cleanHtml.replace(new RegExp("<script\\b[^>]*>([\\s\\S]*?)<\\/script>", "gm"), "");
  cleanHtml = cleanHtml.replace(new RegExp("<style\\b[^>]*>([\\s\\S]*?)<\\/style>", "gm"), "");
  cleanHtml = cleanHtml.replace(new RegExp("<svg\\b[^>]*>([\\s\\S]*?)<\\/svg>", "gm"), "");
  cleanHtml = cleanHtml.replace(new RegExp("", "gm"), "");
  
  // 文字数制限
  cleanHtml = cleanHtml.substring(0, 30000);

  const prompt = `
    あなたは日本のWebフォーム専門のエンジニアです。以下のHTMLから入力項目のCSSセレクタを特定してください。

    【最重要ルール：ボタンの識別】
    日本のフォームは「入力内容を確認 (Confirm)」してページ遷移し、その後に「送信 (Submit)」する2段階構成が多いです。
    - "confirm_button": 「確認」「確認画面へ」「入力内容を確認する」「次へ」などのボタン
    - "submit_button": 「送信」「送信する」「お問い合わせを送信」「完了」などの最終実行ボタン
    ※両方ある場合は明確に区別し、1つしかない場合は文言でどちらか判断してください。

    【最重要ルール：氏名の扱い】
    日本のフォームでは「名前」というラベルでも、入力欄が2つ(姓・名)に分かれていることが非常に多いです。
    - 入力欄が左右または上下に2つある場合 → 必ず "last_name" (1つ目) と "first_name" (2つ目) に分けてください。
    - 入力欄が2つあるのに、1つ目を "person_name" (フルネーム) と判定するのは禁止です。
    - "person_name" は、入力欄が物理的に1つしかない場合のみ使用してください。

    探してほしい項目:
    1. 会社名 (company_name)
    2. 担当者の「姓/苗字」 (last_name) ※2つある入力欄の1つ目
    3. 担当者の「名/名前」 (first_name) ※2つある入力欄の2つ目
    4. 担当者名 (person_name) ※入力欄が1つだけの場合のみ
    5. 部署名 (department_name)
    6. 電話番号 (phone_number)
    7. メールアドレス (email)
    8. 企業URL (company_url)
    9. 件名・タイトル (subject_title)
    10. お問い合わせ内容 (body)
    11. 同意チェックボックス (agreement_checkbox)
    12. 確認ボタン (confirm_button)
    13. 送信ボタン (submit_button)
    
    出力フォーマット(JSONのみ):
    {
      "company_name": "...",
      "last_name": "...",
      "first_name": "...",
      "person_name": "...",
      "department_name": "...",
      "phone_number": "...",
      "email": "...",
      "company_url": "...",
      "subject_title": "...", 
      "body": "...",
      "agreement_checkbox": "...", 
      "confirm_button": "...",
      "submit_button": "..."
    }

    HTML Target:
    ${cleanHtml}
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    return content ? JSON.parse(content) : {};
  } catch (e) {
    console.error("AI Analysis Error:", e);
    return {};
  }
}