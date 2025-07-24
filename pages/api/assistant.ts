// pages/api/assistant.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = 'asst_uOT6SSfMZTqaihnoILhKUdg6';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { answer } = req.body;

  if (!answer || typeof answer !== 'string') {
    return res.status(400).json({ error: 'Invalid answer' });
  }

  try {
    // 1. スレッド作成
    const thread = await openai.beta.threads.create();

    // 2. ユーザー回答を追加
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: answer,
    });

    // 3. アシスタント起動
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // 4. 完了まで待機
    let status = run.status;
    while (status !== 'completed') {
      await new Promise((r) => setTimeout(r, 1000));
      const runStatus = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );
      status = runStatus.status;

      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Run failed: ${status}`);
      }
    }

    // 5. メッセージ一覧取得
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0]?.content[0]?.text?.value;

    if (!response) {
      throw new Error('No response received from Assistant.');
    }

    res.status(200).json({ result: response });
  } catch (error: any) {
    console.error('[Assistant API Error]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
