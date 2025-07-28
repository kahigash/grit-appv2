"use client";

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

// 型定義
type Evaluation = {
  grit_item: number;
  score: number;
  comment: string;
};

// GRIT項目の名前マップ
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

  // localStorage から評価スコアと質問回答を読み込み
  useEffect(() => {
    const stored = localStorage.getItem('gritEvaluations');
    if (stored) {
      try {
        const parsed: Evaluation[] = JSON.parse(stored);
        setEvaluations(parsed);
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }
    const qaPairs = localStorage.getItem('gritQA');
    if (qaPairs) {
      fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qaPairs }),
      })
        .then(res => res.json())
        .then(data => setSummary(data.summary))
        .catch(err => console.error('総評取得エラー:', err));
    }
  }, []);

  const chartData = evaluations.map((item) => ({
    subject: gritItemNameMap[item.grit_item] ?? `項目${item.grit_item}`,
    A: item.score,
  }));

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem' }}>GRIT診断結果</h1>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2rem' }}>総評</h2>
      {summary ? (
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>{summary}</p>
      ) : (
        <p>総評を読み込み中...</p>
      )}

      <h2 style={{ fontSize: '1.5rem', marginTop: '2rem' }}>レーダーチャート</h2>
      <div style={{ width: '100%', height: 400, marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="30%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 5]} />
            <Radar name="GRIT" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2rem' }}>個別評価</h2>
      {evaluations.map((evalItem, idx) => (
        <div
          key={idx}
          style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '6px' }}
        >
          <p><strong>質問{idx + 1}</strong></p>
          <p><strong>対象項目:</strong> {evalItem.grit_item}（{gritItemNameMap[evalItem.grit_item]}）</p>
          <p><strong>スコア:</strong> {evalItem.score}</p>
          <p><strong>コメント:</strong> {evalItem.comment}</p>
        </div>
      ))}
    </div>
  );
}
