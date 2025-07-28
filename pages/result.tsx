'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer
} from 'recharts';

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
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('gritEvaluations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setEvaluations(parsed);
      } catch (e) {
        console.error('Invalid JSON in localStorage');
      }
    }
  }, []);

  const chartData = evaluations.map((item) => ({
    subject: gritItemNameMap[item.grit_item] ?? `項目${item.grit_item}`,
    A: item.score,
  }));

  return (
    <div style={{ padding: '2rem' }}>
      <h2>GRIT診断結果</h2>

      {evaluations.length === 12 ? (
        <>
          <h3 style={{ marginTop: '2rem' }}>総評</h3>
          {/* ここに総評テキストを後で追加できます */}

          <h3 style={{ marginTop: '2rem' }}>レーダーチャート</h3>
          <div style={{ width: '600px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 5]} />
                <Radar name="GRIT" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{ marginTop: '2rem' }}>個別評価</h3>
          {evaluations.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
              <p><strong>質問{idx + 1}:</strong></p>
              <p><strong>対象項目:</strong> {item.grit_item}（{gritItemNameMap[item.grit_item]}）</p>
              <p><strong>スコア:</strong> {item.score}</p>
              <p><strong>コメント:</strong> {item.comment}</p>
            </div>
          ))}

          <button
            style={{ marginTop: '2rem' }}
            onClick={() => router.push('/')}
          >
            最初のページに戻る
          </button>
        </>
      ) : (
        <p>12問すべての評価が揃っていないため、結果を表示できません。</p>
      )}
    </div>
  );
}
