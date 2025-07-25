import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { answer, grit_item, grit_item_name, questionId } = req.body;

  // ダミー評価ロジック（必要に応じてここにGPT APIなどの評価ロジックを追加）
  const result = {
    grit_item: grit_item ?? 1,
    grit_item_name: grit_item_name ?? '未設定',
    score: 5,
    comment: '回答の傾向に基づいた評価コメントをここに出力する',
  };

  res.status(200).json(result);
}
