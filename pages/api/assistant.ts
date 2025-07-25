// /pages/api/assistant.ts

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = process.env.OPENAI_ASSISTANT_ID as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { answer, evaluatedItems } = req.body;

  if (!answer || !Array.isArray(evaluatedItems)) {
    return res.status(400).json({ error: 'Missing answer or evaluatedItems' });
  }

  try {
    const thread = await openai.beta.threads.create();

    const prompt = `
あなたはユーザーのGRITを評価するAI面接官です。
以下のGRIT項目はすでに評価済みです：${evaluatedItems.join(', ') || 'なし'}
残りのGRIT項目（未評価）に対応する、新たな質問を1つ生成してください。
質問は間接的・具体的にしてください。出力は質問文のみで、150文字以内にしてください。
`;

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Pollingで完了を待機
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== 'completed');

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data
      .filter(m => m.role === 'assistant')
      .map(m => m.content[0]?.text?.value || '')
      .join('\n')
      .trim();

    return res.status(200).json({ question: reply });
  } catch (err) {
    console.error('[Assistant API Error]', err);
    return res.status(500).json({ error: 'Assistant API Error' });
  }
}
