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

  const { answer, grit_item } = req.body;

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

    // コメントブロックやコードブロックを除去しつつ、最初のJSONのみ抽出
    const match = rawText.match(/({[\s\S]*?})/);

    if (!match) {
      throw new Error('No valid JSON found in Assistant response');
    }

    const json = JSON.parse(match[1]);

    // 🔧 出題側で指定された grit_item を優先して使用
    if (typeof grit_item === 'number') {
      json.grit_item = grit_item;
    }

    // grit_item_name を追加（番号と名称のマッピング）
    const gritItemNames: { [key: number]: string } = {
      1: '長期的視野',
      2: '目標設定力',
      3: '挑戦志向',
      4: '回復力',
      5: '柔軟性',
      6: '内発的動機',
      7: '没頭力',
      8: '困難対応力',
      9: '継続力',
      10: '学習志向',
      11: 'やり遂げる力',
      12: 'モチベーション持続力',
    };

    json.grit_item_name = gritItemNames[json.grit_item] || '不明';

    res.status(200).json(json);
  } catch (error: any) {
    console.error('[Assistant API Error]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
