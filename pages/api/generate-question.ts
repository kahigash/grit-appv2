import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const ASSISTANT_ID = 'asst_IKhqPUQ0DYuhqzEp6Mj1oizR';
const MAX_QUESTIONS = 12;

const gritItemNameMap: Record<number, string> = {
  1: '注意散漫への対処力',
  2: '熱意の持続性',
  3: '長期集中力',
  4: '関心の安定性',
  5: '目標の一貫性',
  6: '関心の持続力',
  7: '没頭力',
  8: 'レジリエンス',
  9: '長期的継続力',
  10: '地道な努力の継続性',
  11: 'やり遂げ力',
  12: 'モチベーションの自己管理力',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { usedGritItems, messages } = req.body;

  if (!Array.isArray(messages) || !Array.isArray(usedGritItems)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  try {
    // 質問回数のカウント
    const questionCount = messages.filter((m: any) => m.role === 'assistant').length;

    if (questionCount >= MAX_QUESTIONS) {
      return res.status(200).json({
        result: 'これで質問は終了です。お疲れさまでした！',
        grit_item: null,
        grit_item_name: null,
        questionId: questionCount + 1,
      });
    }

    // 未使用のGRIT項目リストを作成
    const allItems = Array.from({ length: 12 }, (_, i) => i + 1);
    const remainingItems = allItems.filter((item) => !usedGritItems.includes(item));

    if (remainingItems.length === 0) {
      return res.status(200).json({
        result: 'これで質問は終了です。お疲れさまでした！',
        grit_item: null,
        grit_item_name: null,
        questionId: questionCount + 1,
      });
    }

    // 次のGRIT項目をランダム選出
    const gritItem = remainingItems[Math.floor(Math.random() * remainingItems.length)];
    const gritItemName = gritItemNameMap[gritItem];

    // 直前のユーザー回答（任意）を取得
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    const lastAnswer = lastUserMessage?.content ?? '';

    // Assistant API 呼び出し
    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `GRIT項目${gritItem}に対応する質問を出してください。\n前のユーザー回答: ${lastAnswer}`,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Run完了待ち
    let status = run.status;
    while (status !== 'completed') {
      await new Promise((r) => setTimeout(r, 1000));
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = runStatus.status;
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Run failed: ${status}`);
      }
    }

    // 出力取得
    const messagesList = await openai.beta.threads.messages.list(thread.id);
    const latest = messagesList.data[0];
    const textContent = latest.content.find(
      (c): c is { type: 'text'; text: { value: string; annotations: any } } => c.type === 'text'
    );

    if (!textContent) {
      throw new Error('No text content found');
    }

    const result = textContent.text.value.trim();

    res.status(200).json({
      result,
      grit_item: gritItem,
      grit_item_name: gritItemName,
      questionId: questionCount + 1,
    });
  } catch (err: any) {
    console.error('[Generate Question Error]', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
