// pages/api/assistant.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // .env.local に設定してください
});

// あなたの Assistant ID（固定）
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
    // 1. スレッド作成（毎回新しい面接セッション）
    const thread = await openai.beta.threads.create();

    // 2. ユーザーの回答を送信
await openai.beta.threads.messages.create(
  thread.id,
  {
    role: 'user',
    content: answer,
  }
);


    // 3. Assistantを起動
    const run = await openai.beta.threads.runs.create({
      thread_id: thread.id,
      assistant_id: ASSISTANT_ID,
    });

    // 4. 完了まで待機（最大30秒程度）
    let status = 'queued';
    while (status !== 'completed') {
      await new Promise((r) => setTimeout(r, 1000));
      const runStatus = await openai.beta.threads.runs.retrieve({
        thread_id: thread.id,
        run_id: run.id,
      });
      status = runStatus.status;

      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Run failed: ${status}`);
      }
    }

    // 5. 回答取得
    const messages = await openai.beta.threads.messages.list({ thread_id: thread.id });
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
