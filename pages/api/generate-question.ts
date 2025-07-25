import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, evaluatedItems } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  const remainingItems = Array.from({ length: 12 }, (_, i) => i + 1).filter(
    (item) => !evaluatedItems.includes(item)
  );

  if (remainingItems.length === 0) {
    return res.status(200).json({ result: '全ての質問が完了しました。お疲れさまでした。' });
  }

  const prompt = `
あなたはGRIT測定の質問生成AIです。
以下の評価済み項目: [${evaluatedItems.join(', ')}] を避けて、
次に評価すべきGRIT項目: ${remainingItems[0]} に関連する、自然な日本語の質問を1つ出力してください。

制約：
- 出力は150文字以内
- ユーザーの回答履歴を参考にしてください
- 直接「GRIT」や「やり抜く力」などの語を出してはいけません

回答履歴:
${messages.map((m) => `${m.role === 'user' ? 'A:' : 'Q:'} ${m.content}`).join('\n')}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      max_tokens: 200,
    });

    const result = completion.choices[0].message.content;
    res.status(200).json({ result });
  } catch (err: any) {
    console.error('質問生成エラー:', err.message);
    res.status(500).json({ error: '質問生成失敗' });
  }
}
