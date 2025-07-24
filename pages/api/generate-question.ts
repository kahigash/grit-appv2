// /api/generate-question.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { history, currentIndex } = req.body;

  const systemPrompt = `
あなたはGRIT（非認知能力）を構成する12の要素を評価するインタビュアーです。

これまでの会話（質問と回答）を踏まえ、自然な流れで次の質問を提示してください。

- 直前の回答に対して、短い共感コメント（リアクション）を文頭に含めてください。
- そのまま接続詞などを使って、続けて次の質問をしてください。
- 質問は具体的かつ自然で、1〜3個のGRIT評価項目を測定できるようにしてください。
- 質問文は150文字以内で、日本語で出力してください。
- 出力は1文のみで、リアクションと質問を分けないでください。
`;

  const historyString = history
    .map(
      (entry: { question: string; answer: string }, i: number) =>
        `Q${i + 1}: ${entry.question}\nA${i + 1}: ${entry.answer}`
    )
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `【これまでのやりとり】\n${historyString}\n\n次の質問を出してください。`,
      },
    ],
    temperature: 0.7,
  });

  const output = completion.choices[0].message.content;
  res.status(200).json({ question: output });
}
