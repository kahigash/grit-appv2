import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

// GRIT項目の日本語ラベル
const GRIT_LABELS: Record<number, string> = {
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
  12: 'モチベ維持力',
};

export default function ResultPage() {
  const router = useRouter();
  const [scores, setScores] = useState<any[]>([]);

  // localStorageから評価スコアを取得
  useEffect(() => {
    const raw = localStorage.getItem('gritEvaluations');
    if (!raw) {
      router.push('/');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setScores(parsed);
    } catch {
      router.push('/');
    }
  }, [router]);

  const chartData = scores.map((item) => ({
    subject: GRIT_LABELS[item.grit_item] || `項目${item.grit_item}`,
    score: item.score,
  }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">GRIT診断結果</h1>

      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 5]} />
            <Radar name="スコア" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-10">
        {scores.map((item, idx) => (
          <div key={idx} className="mb-4 p-4 border rounded-md shadow">
            <p><strong>質問{idx + 1}：</strong> {GRIT_LABELS[item.grit_item] || `項目${item.grit_item}`}</p>
            <p><strong>スコア：</strong> {item.score}</p>
            <p><strong>コメント：</strong> {item.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
