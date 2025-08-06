import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// 総評用のアシスタントID
const ASSISTANT_ID = 'asst_Bh72OE8J9tAsOXc0tvVACq7h';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qaPairs, evaluations } = req.body;

  if (!qaPairs || typeof qaPairs !== 'object' || !Array.isArray(evaluations)) {
    return res.status(400).json({ error: 'Invalid or missing qaPairs or evaluations' });
  }

  try {
    // ✅ ステップ1: リクエストデータをログ出力
    console.log('🧪 qaPairs:', JSON.stringify(qaPairs, null, 2));
    console.log('🧪 evaluations:', JSON.stringify(evaluations, null, 2));

    const thread = await openai.beta.threads.create();

    // 質問回答ペア + 評価スコアをまとめてAssistantに渡す
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: JSON.stringify({
        qaPairs,
        evaluations,
      }),
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

    // ✅ ステップ2: Assistantの出力をログ出力
    console.log('📨 Assistant response text:', rawText);

    const match = rawText.match(/({[\s\S]*?})/);

    if (!match) {
      throw new Error('No valid JSON found in Assistant response');
    }

    const json = JSON.parse(match[1]);

    res.status(200).json(json);
  } catch (error: any) {
    console.error('[Summary API Error]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
