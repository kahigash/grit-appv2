'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Evaluation = {
  grit_item: number;
  score: number;
  comment: string;
};

const gritLabels: { [key: number]: string } = {
  1: '注意散漫対処',
  2: '情熱継続',
  3: '挑戦志向',
  4: 'レジリエンス',
  5: '柔軟性',
  6: '内発動機',
  7: '没頭力',
  8: '困難対応',
  9: '継続力',
  10: '学習志向',
  11: 'やり遂げ力',
  12: 'モチベ維持',
};

export default function ResultPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem('gritEvaluations');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setEvaluations(parsed);
      } catch (e) {
        console.error('Invalid localStorage data');
      }
    }
  }, []);

  const radarData = evaluations.map((item) => ({
    subject: gritLabels[item.grit_item],
    A: item.score,
    fullMark: 5,
  }));

  return (
    <div style={{ padding: '2rem' }}>
      <h2>GRIT診断結果</h2>

      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 5]} />
            <Radar name="スコア" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ marginTop: '2rem' }}>詳細評価</h3>
      {evaluations.map((item, index) => (
        <div key={index} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc' }}>
          <p><strong>項目{item.grit_item}：</strong> {gritLabels[item.grit_item]}</p>
          <p><strong>スコア：</strong> {item.score}</p>
          <p><strong>コメント：</strong> {item.comment}</p>
        </div>
      ))}

      <button onClick={() => router.push('/')} style={{ marginTop: '2rem' }}>
        最初のページに戻る
      </button>
    </div>
  );
}
