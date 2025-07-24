// pages/api/assistant.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
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
    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: answer,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    let status = 'queued';
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

    const content = latest.content.find((c) => c.type === 'text');
    const response = content && 'text' in content ? content.text.value : null;

    if (!response) {
      throw new Error('No text response from Assistant.');
    }

    // console.log や他の出力はここまで
    res.status(200).json({ result: response });
  } catch (error: any) {
    // エラー詳細はサーバーログに出力（レスポンスには含めない）
    console.error('[Assistant API Error]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
