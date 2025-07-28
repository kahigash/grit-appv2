'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Evaluation = {
  grit_item: number;
  score: number;
  comment: string;
};

const gritItemNameMap: Record<number, string> = {
  1: '注意散漫への対処力',
  2: '興味・情熱の継続力',
  3: '目標に向かう力',
  4: '困難に立ち向かう力',
  5: '柔軟性',
  6: '内発的動機',
  7: '没頭力',
  8: '困難対応力',
  9: '継続力',
  10: '学習志向',
  11: 'やり遂げる力',
  12: 'モチベーション持続力',
};

export default function ResultPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [summary, setSummary] = useState('');
  const [dots, setDots] = useState('.');

  // ドットの増減用エフェクト（1秒周期）
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('gritEvaluations');
    if (stored) {
      const parsed = JSON.parse(stored);
      setEvaluations(parsed);

      // 質問と回答のペアを文字列に整形
      const qaPairs = parsed
        .map((item: Evaluation, idx: number) => {
          return `【質問${idx + 1}】\nQ: ${gritItemNameMap[item.grit_item]}\nA: ${item.comment}`;
        })
        .join('\n\n');

      fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qaPairs }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.summary) setSummary(data.summary);
        })
        .catch((err) => {
          console.error('AIコメント取得エラー:', err);
          setSummary('AIコメントの取得に失敗しました。');
        });
    }
  }, []);

  if (evaluations.length === 0) {
    return <p>評価データが見つかりません。</p>;
  }

  const averageScore = (
    evaluations.reduce((sum, item) => sum + item.score, 0) / evaluations.length
  ).toFixed(2);

  const scoreLevel = (score: number) => {
    if (score >= 4.5) return '非常に高いGRITスコアです。自己管理能力が優れています。';
    if (score >= 3.5) return '高めのGRITスコアです。安定した継続力が期待できます。';
    if (score >= 2.5) return '平均的なGRITスコアです。職務内容によっては適応力が求められます。';
    return 'GRITスコアがやや低めです。根気や粘り強さの確認が必要かもしれません。';
  };

  const chartData = evaluations.map((item) => ({
    subject: gritItemNameMap[item.grit_item] ?? `項目${item.grit_item}`,
    A: item.score,
  }));

  return (
    <div style={{ padding: '2rem' }}>
      <h1>GRIT診断結果</h1>

      <h2>AIコメント</h2>
      <p style={{ whiteSpace: 'pre-line', marginBottom: '2rem' }}>
        {summary ? summary : `AIコメント作成中${dots}`}
      </p>

      <h2>結果サマリー</h2>
      <p>平均スコア: {averageScore}</p>
      <p>{scoreLevel(parseFloat(averageScore))}</p>

      <h2>レーダーチャート</h2>
      <div style={{ width: '100%', height: 400, marginBottom: '2rem' }}>
        <ResponsiveContainer width="70%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 5]} />
            <Radar name="GRIT" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <h2>個別評価</h2>
      {evaluations.map((evalItem, idx) => (
        <div key={idx} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ccc' }}>
          <p><strong>質問{idx + 1}</strong></p>
          <p><strong>対象項目:</strong> {evalItem.grit_item}（{gritItemNameMap[evalItem.grit_item]}）</p>
          <p><strong>スコア:</strong> {evalItem.score}</p>
          <p><strong>コメント:</strong> {evalItem.comment}</p>
        </div>
      ))}
    </div>
  );
}
