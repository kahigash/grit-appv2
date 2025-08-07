import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
    console.log('📥 Received body:', req.body);

    const parsedQAPairs = typeof qaPairs === 'string' ? JSON.parse(qaPairs) : qaPairs;

    // ✅ 離職確率をサーバー側で計算
    const weights: Record<number, number> = {
      2: 0.30,
      5: 0.25,
      8: 0.20,
      12: 0.15,
      4: 0.10,
    };

    let weightedSum = 0;
    let weightTotal = 0;

    evaluations.forEach((evalItem: any) => {
      const weight = weights[evalItem.grit_item];
      if (weight) {
        weightedSum += evalItem.score * weight;
        weightTotal += weight;
      }
    });

    const turnoverRate = Math.round((1 - weightedSum / 5) * 100);
    console.log('📊 Calculated Turnover Rate:', turnoverRate);

    const startTime = Date.now();

    // ✅ Assistant実行開始
    const thread = await openai.beta.threads.create();

    // ⏱️ 最後の2ターン分だけ送信（質問＋回答）
    const recentPairs = parsedQAPairs.slice(-2);

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: JSON.stringify({
        qaPairs: recentPairs,
        evaluations,
        turnoverRate,
      }),
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      temperature: 0.3,
    });

    let status = run.status;
    let waitCount = 0;

    while (status !== 'completed') {
      await new Promise((r) => setTimeout(r, 500)); // ⏱️ 500ms polling
      waitCount++;
      console.log(`⏳ Waiting... ${waitCount * 0.5}s elapsed`);

      if (waitCount > 240) {
        throw new Error('⏰ Timeout: Assistant API did not respond within 120 seconds.');
      }

      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = runStatus.status;
      console.log('📡 Current run status:', status);

      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`❌ Run failed with status: ${status}`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Assistant run completed in ${elapsed}s`);

    // ✅ 完了したらメッセージ取得
    const messages = await openai.beta.threads.messages.list(thread.id);
    const latest = messages.data[0];

    const textContent = latest.content.find(
      (c): c is { type: 'text'; text: { value: string; annotations: any } } => c.type === 'text'
    );

    if (!textContent) {
      throw new Error('❌ No text response from Assistant');
    }

    const rawText = textContent.text.value.trim();
    console.log('📨 Assistant response text:', rawText);

    const match = rawText.match(/({[\s\S]*?})/);

    if (!match) {
      throw new Error('❌ No valid JSON found in Assistant response');
    }

    const json = JSON.parse(match[1]);
    res.status(200).json(json);
  } catch (error: any) {
    console.error('[Summary API Error]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
