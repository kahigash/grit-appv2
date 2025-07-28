import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// 事前に作成したアシスタントID（総評用）
const ASSISTANT_ID = 'asst_Bh72OE8J9tAsOXc0tvVACq7h';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qaPairs } = req.body;

  if (!qaPairs || typeof qaPairs !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing qaPairs' });
  }

  try {
    const thread = await openai.beta.threads.create();

    // Q&Aペアをそのまま入力
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: qaPairs,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    let status = run.status;
    while (status !== 'completed') {
      await new Promise((r) => setTimeout(r, 1000));
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = runStatus.status;
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Run failed: ${status}`);
      }
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const latest = messages.data[0];
    const textContent = latest.content.find(
      (c): c is { type: 'text'; text: { value: string; annotations: any } } => c.type === 'text'
    );

    if (!textContent) {
      throw new Error('No text response from Assistant');
    }

    const rawText = textContent.text.value.trim();
    const match = rawText.match(/({[\s\S]*?})/);

    if (!match) {
      throw new Error('No valid JSON found in Assistant response');
    }

    const json = JSON.parse(match[1]); // JSONオブジェクトのみ抽出

    res.status(200).json(json);
  } catch (error: any) {
    console.error('[Summary API Error]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
