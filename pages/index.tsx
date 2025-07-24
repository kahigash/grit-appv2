'use client';

import { useState } from 'react';
import axios from 'axios';

type ChatEntry = {
  type: 'question' | 'answer';
  text: string;
};

type EvaluationResult = {
  grit_item: number;
  score: number;
  comment: string;
};

export default function Home() {
  const [chatLog, setChatLog] = useState<ChatEntry[]>([
    { type: 'question', text: '質問 1 / 5 これまでに、どうしてもやり遂げたいと思って粘り強く取り組んだ長期的な目標やプロジェクトがあれば教えてください。その際に直面した最も大きな困難と、それをどう乗り越えたかを詳しく聞かせてください。' },
  ]);
  const [input, setInput] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    setChatLog((prev) => [...prev, { type: 'answer', text: input }]);
    setLoading(true);
    try {
      const response = await axios.post('/api/assistant', { answer: input });
      const data = response.data;

      setEvaluation({
        grit_item: data.grit_item,
        score: data.score,
        comment: data.comment,
      });
    } catch (error) {
      alert('通信エラー：' + (error as any).message);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <main style={{ display: 'flex', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* 左側：質問と回答 */}
      <section style={{ flex: 2, paddingRight: '20px' }}>
        <h2>GRITチャット</h2>
        {chatLog.map((entry, idx) => (
          <div key={idx} style={{ marginBottom: '10px' }}>
            <strong>{entry.type === 'question' ? 'Q:' : 'A:'}</strong> {entry.text}
          </div>
        ))}
        <textarea
          rows={3}
          style={{ width: '100%', marginTop: '10px' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} style={{ marginTop: '10px' }}>
          GPT評価で試す
        </button>
      </section>

      {/* 右側：評価結果表示 */}
      <aside style={{ flex: 1, borderLeft: '1px solid #ccc', paddingLeft: '20px' }}>
        <h3>評価スコア</h3>
        {evaluation ? (
          <div>
            <p><strong>項目:</strong> {evaluation.grit_item}</p>
            <p><strong>スコア:</strong> {evaluation.score}</p>
            <p><strong>コメント:</strong> {evaluation.comment}</p>
          </div>
        ) : (
          <p>評価結果はここに表示されます。</p>
        )}
      </aside>
    </main>
  );
}
