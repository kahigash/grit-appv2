import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL_NAME = process.env.MODEL_NAME ?? 'gpt-4o';
const MAX_QUESTIONS = 12;

// GRIT項目の正式名称マップ（1〜12）
const gritItemNameMap: Record<number, string> = {
  1: '注意散漫への対処力',
  2: '興味・情熱の継続力',
  3: '目標に向かう力',
  4: '困難に立ち向かう力',
  5: '長期的継続力',
  6: '最後までやり遂げる力',
  7: '没頭力',
  8: '計画性・目標設計力',
  9: '感情のコントロール力',
  10: '自分を信じる力（自己効力感）',
  11: '支援を求める力',
  12: 'モチベーション持続力',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, usedGritItems: providedUsedGritItems } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  const questionCount = messages.filter((m: any) => m.role === 'assistant').length;

  // Q1（最初の質問）は固定
  if (questionCount === 0) {
    return res.status(200).json({
      result: '仕事中に新しいアイデアが浮かんだとき、現在の作業とどうバランスをとりますか？',
      questionId: 1,
      grit_item: 1,
      grit_item_name: '注意散漫への対処力',
    });
  }

  // 使用済みGRIT項目の抽出（新ロジック）
  const usedGritItems: number[] = Array.isArray(providedUsedGritItems)
    ? providedUsedGritItems
    : messages
        .filter((m: any) => m.role === 'assistant' && typeof m.grit_item === 'number')
        .map((m: any) => m.grit_item);

  // すべての質問が終わった場合
  if (questionCount >= MAX_QUESTIONS || usedGritItems.length >= 12) {
    return res.status(200).json({
      result: 'ご協力ありがとうございました。これまでのお話はとても興味深かったです。以上で質問は終了です。お疲れ様でした。',
      questionId: questionCount + 1,
      grit_item: 0,
      grit_item_name: '終了',
    });
  }

  // 未出題のGRIT項目を特定
  const remainingGritItems = Object.keys(gritItemNameMap)
    .map(Number)
    .filter((item) => !usedGritItems.includes(item));

  if (remainingGritItems.length === 0) {
    return res.status(200).json({
      result: 'すべてのGRIT項目への質問が完了しました。ご協力ありがとうございました！',
      questionId: questionCount + 1,
      grit_item: 0,
      grit_item_name: '終了',
    });
  }

  const gritItem = remainingGritItems[0]; // ランダムにしたい場合はここをシャッフルしても良い
  const gritItemName = gritItemNameMap[gritItem];

  const systemPrompt = `
あなたは企業の採用面接におけるインタビュアーです。候補者の「GRIT（やり抜く力）」を測定するため、以下の方針で質問を作成してください。

【質問方針】
- 質問は必ず日本語で、1つだけ提示してください。
- 「あなたはGRITがありますか？」のような直接的な表現は禁止です。
- 候補者の経験・行動・思考パターンからGRITの傾向がわかるような、間接的かつ具体的な質問を出してください。
- 前の回答に対して短い共感コメントを自然な文章に組み込んでから、続けて次の質問を提示してください。
- 「共感コメント:」「次の質問:」などの表記は使わず、ひとつの自然な質問文として出力してください。
- 回答の深掘りを意識してください。前の回答内容を引用しながら「〜とのことですが、なぜそうしたのか？」「そのときどう感じましたか？」のような形で掘り下げてください。
- 出力文には「Q1:」「Q:」「A:」などのラベルを含めないでください。
- 出力は150文字以内に収めてください。
`;

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: fullMessages,
      temperature: 0.7,
    });

    const generated = response.choices?.[0]?.message?.content?.trim() || '';

    if (!generated) {
      return res.status(500).json({ error: 'No content generated' });
    }

    const questionId = questionCount + 1;

    return res.status(200).json({
      result: generated,
      questionId,
      grit_item: gritItem,
      grit_item_name: gritItemName,
    });
  } catch (error: any) {
    console.error('OpenAI Error:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to generate question' });
  }
}
