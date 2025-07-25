import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL_NAME = process.env.MODEL_NAME ?? 'gpt-4o';
const MAX_QUESTIONS = 12;
const FIXED_Q1 =
  '仕事中に新しいアイデアが浮かんだとき、現在の作業とどうバランスをとりますか？';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  const questionCount = messages.filter((m: any) => m.role === 'assistant').length;

  // 最初の質問は固定
  if (questionCount === 0) {
    return res.status(200).json({
      result: FIXED_Q1,
      grit_item: 1,
      grit_item_name: '注意散漫への対処力',
      questionId: 1,
    });
  }

  // 終了条件（12問完了後）
  if (questionCount >= MAX_QUESTIONS) {
    const closingResponse = `ご協力ありがとうございました。これまでのお話はとても興味深かったです。以上で質問は終了です。お疲れ様でした。`;
    return res.status(200).json({ result: closingResponse });
  }

  // GRIT項目番号（2〜12をローテーション）
  const gritItem = (questionCount % 12) + 1;
  const gritItemName = `GRIT項目${gritItem}（未設定）`;

  const systemPrompt = `
あなたは企業の採用面接におけるインタビュアーです。候補者の「GRIT（やり抜く力）」を測定するため、以下の方針で質問を作成してください。

【質問方針】
- 質問は必ず日本語で、1つだけ提示してください。
- 「あなたはGRITがありますか？」のような直接的な表現は禁止です。
- 候補者の経験・行動・思考パターンからGRITの傾向がわかるような、間接的かつ具体的な質問を出してください。
- 前の回答に対して短い共感コメントを自然な文章に組み込んでから、続けて次の質問を提示してください。
- 「共感コメント:」「次の質問:」などの表記は使わず、ひとつの自然な質問文として出力してください。
- 回答の深掘りを意識してください。前の回答内容を引用しながら「〜とのことですが、なぜそうしたのか？」「そのときどう感じましたか？」のような形で掘り下げてください。
- 出力文には「Q1:」「Q:」「A:」などのラベルを含めないでください。
- 出力は150文字以内に収めてください。
`;

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: fullMessages,
      temperature: 0.7,
    });

    const generated = response.choices?.[0]?.message?.content?.trim() || '';
    if (!generated) {
      return res.status(500).json({ error: 'No content generated' });
    }

    res.status(200).json({
      result: generated,
      grit_item: gritItem,
      grit_item_name: gritItemName,
      questionId: questionCount + 1,
    });
  } catch (error: any) {
    console.error('OpenAI Error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate question' });
  }
}
