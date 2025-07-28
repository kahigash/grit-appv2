'use client';

import { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

const riskExamples: Record<number, string> = {
  1: '注意が散漫になりやすく、複数タスクで混乱する可能性があります。',
  2: '関心が継続せず、途中で興味を失うリスクがあります。',
  3: '挑戦に積極的でない場合、変化に対応しづらくなる可能性があります。',
  4: 'ストレスや逆境に対する回復が遅く、モチベーションが低下しやすくなります。',
  5: '変化に適応しづらく、柔軟な対応ができないリスクがあります。',
  6: '動機づけが外的要因に左右されやすく、自主性に欠ける恐れがあります。',
  7: '集中力が続かず、成果が中途半端になる可能性があります。',
  8: '困難に受け身で対応しがちで、課題が長引く恐れがあります。',
  9: '長期的な努力が継続できず、結果に結びつかないことがあります。',
  10: '学習の反復や改善が少なく、成長が鈍化する可能性があります。',
  11: '最後までやり抜けず、信頼性に欠けると見なされる恐れがあります。',
  12: 'モチベーションの維持が難しく、波が激しい傾向があります。',
};

export default function ResultPage() {
  const [evaluations, setEvaluations] = useState<any[]>([]);

  useEffect(() => {
    const data = localStorage.getItem('gritEvaluations');
    if (data) {
      setEvaluations(JSON.parse(data));
    }
  }, []);

  const averageScore =
    evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
      : 0;

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return '非常に高いGRIT（Top Tier）';
    if (score >= 3.5) return '高めのGRIT（Reliable）';
    if (score >= 2.5) return '平均的GRIT（Typical）';
    if (score >= 1.5) return 'GRITが弱め（Unstable）';
    return '要改善（Critical）';
  };

  const chartData = evaluations.map((item) => ({
    subject: gritItemNameMap[item.grit_item] ?? `項目${item.grit_item}`,
    A: item.score,
  }));

  return (
    <div style={{ padding: '2rem' }}>
      <h1>GRIT診断結果</h1>

      <section style={{ marginTop: '2rem' }}>
        <h2>総評</h2>
        <p><strong>平均スコア:</strong> {averageScore.toFixed(2)} / 5</p>
        <p><strong>評価:</strong> {getScoreLabel(averageScore)}</p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>レーダーチャート</h2>
        <div style={{ width: '600px', height: '400px' }}>
          <ResponsiveContainer>
            <RadarChart outerRadius={150} data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 5]} />
              <Radar name="スコア" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>個別評価</h2>
        {evaluations.map((e, i) => (
          <div key={i} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
            <p><strong>{gritItemNameMap[e.grit_item]}</strong></p>
            <p>スコア: {e.score}</p>
            <p>コメント: {e.comment}</p>
            {e.score <= 2 && (
              <p style={{ color: 'red' }}><strong>⚠ リスク:</strong> {riskExamples[e.grit_item]}</p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
