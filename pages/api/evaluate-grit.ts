import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { messages } = req.body;

  const userAnswers = messages.filter((m: any) => m.role === 'user').map((m: any) => m.content);
  const lastAnswer = userAnswers[userAnswers.length - 1];

  const evaluationPrompt = `
あなたはGRIT評価の専門家です。
以下の「ユーザーの回答」について、次の4つの構成要素にそれぞれどの程度関連しているかを**絶対評価**してください：

- perseverance（粘り強さ）
- passion（情熱）
- goal_orientation（目標志向性）
- resilience（回復力）

各構成要素について、0〜5のスコアで評価してください（加点方式、減点なし）。
また、回答と関連している要素名（英語名）を列挙してください。

出力は以下の形式としてください：

{
  "score": {
    "perseverance": 数値（0〜5）,
    "passion": 数値（0〜5）,
    "goal_orientation": 数値（0〜5）,
    "resilience": 数値（0〜5）
  },
  "relatedFactors": ["関連する要素の英語名"]
}

ユーザーの回答:
${lastAnswer}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content || '';

    // JSONを抽出
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('JSON形式の出力が見つかりませんでした');
    }

    const parsed = JSON.parse(match[0]);

    res.status(200).json({
      score: parsed.score,
      relatedFactors: parsed.relatedFactors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GRIT評価に失敗しました' });
  }
}
