'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// 評価の型定義
type Evaluation = {
  grit_item: number;
  score: number;
  comment: string;
};

// GRIT項目のマッピング
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
  const [summary, setSummary] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('gritEvaluations');
    if (stored) {
      const parsed = JSON.parse(stored);
      setEvaluations(parsed);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('gritEvaluations');
    if (stored) {
      const parsed = JSON.parse(stored);
      const formattedText = parsed
        .map(
          (item: Evaluation, index: number) =>
            `【質問${index + 1}】\nQ: ${gritItemNameMap[item.grit_item] ?? '不明な項目'}に関する質問\nA: ${item.comment}`
        )
        .join('\n\n');

      fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qaPairs: formattedText }),
      })
        .then((res) => res.json())
        .then((data) => {
          setSummary(data.summary || '総評の取得に失敗しました');
        })
        .catch((err) => {
          console.error('総評取得エラー:', err);
          setSummary('総評の取得に失敗しました');
        });
    }
  }, []);

  const chartData = evaluations.map((item) => ({
    subject: gritItemNameMap[item.grit_item] ?? `項目${item.grit_item}`,
    A: item.score,
  }));

  const averageScore =
    evaluations.length > 0
      ? (
          evaluations.reduce((sum, item) => sum + item.score, 0) /
          evaluations.length
        ).toFixed(2)
      : 'N/A';

  const scoreLevel = (avg: number) => {
    if (avg >= 4.5) return '非常に高いGRITスコアです。自信を持って推奨できます。';
    if (avg >= 3.5) return '高めのGRITスコアです。安定した傾向が見られます。';
    if (avg >= 2.5) return '平均的なGRITスコアです。課題の可能性が一部見られます。';
    return 'ややGRITが不足している傾向があります。注意が必要です。';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>GRIT診断結果</h1>

      <h2>AIコメント</h2>
      {summary === null ? (
        <p style={{ marginBottom: '2rem' }}>AIコメント作成中...</p>
      ) : (
        <p style={{ whiteSpace: 'pre-line', marginBottom: '2rem' }}>{summary}</p>
      )}

  <h2>結果サマリー</h2>
  <p>平均スコア: {averageScore}</p>
  <p>{scoreLevel(parseFloat(averageScore))}</p>


      <h2>レーダーチャート</h2>
      <div style={{ maxWidth: 600, marginLeft: 0 }}>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 5]} />
            <Tooltip />
            <Radar
              name="GRIT"
              dataKey="A"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <h2>個別評価</h2>
      {evaluations.map((item, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            border: '1px solid #ccc',
            borderRadius: '8px',
          }}
        >
          <p>
            <strong>項目{item.grit_item}：</strong> {gritItemNameMap[item.grit_item]}
          </p>
          <p>
            <strong>スコア：</strong> {item.score}
          </p>
          <p>
            <strong>コメント：</strong> {item.comment}
          </p>
        </div>
      ))}
    </div>
  );
}
