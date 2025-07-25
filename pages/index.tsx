'use client';

import { useState } from 'react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Evaluation {
  grit_item: number;
  grit_item_name: string;
  score: number;
  comment: string;
}

export default function Home() {
  const initialQuestion =
    'これまでに、どうしてもやり遂げたいと思って粘り強く取り組んだ長期的な目標やプロジェクトがあれば教えてください。その際に直面した最も大きな困難と、それをどう乗り越えたかを詳しく聞かせてください。';

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialQuestion },
  ]);
  const [answer, setAnswer] = useState('');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);

// handleSubmit の冒頭部分を修正します
const handleSubmit = async () => {
  if (!answer.trim()) return;

  const currentAnswer = answer; // 送信前にコピーして保持
  setAnswer(''); // 入力欄を即時クリア

  setLoading(true);
  setError('');
  setEvaluation(null);

  try {
    const updatedMessages: Message[] = [...messages, { role: 'user', content: currentAnswer }];
    setMessages(updatedMessages);

    // 評価取得
    const evalRes = await axios.post('/api/assistant', { answer: currentAnswer });
    setEvaluation(evalRes.data);

    // 次の質問を取得
    const questionRes = await axios.post('/api/generate-question', {
      messages: updatedMessages,
    });
    const nextQuestion = questionRes.data.result;

    // 次の質問を追加
    setMessages((prev) => [...prev, { role: 'assistant', content: nextQuestion }]);

    // カウント進める
    setQuestionIndex((prev) => prev + 1);
  } catch (err: any) {
    setError('通信エラー：' + (err?.message || '不明なエラー'));
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
      {/* 左：チャット形式の質問と回答履歴 */}
      <div style={{ flex: 2 }}>
        <h2>GRITチャット</h2>
        {messages.map((msg, idx) => (
          <p key={idx}>
            <strong>{msg.role === 'assistant' ? `Q: 質問 ${Math.ceil((idx + 1) / 2)} / 5` : 'A:'}</strong>{' '}
            {msg.content}
          </p>
        ))}
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          style={{ width: '100%', marginTop: '1rem' }}
          placeholder="ここに回答を入力してください"
        />
        <br />
        <button onClick={handleSubmit} disabled={loading || !answer}>
          {loading ? '送信中...' : '送信'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      {/* 右：評価スコア履歴表示 */}
      <div style={{ flex: 1 }}>
        <h3>評価スコア</h3>
        {evaluations.map((evalItem, idx) => (
          <div key={idx} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ccc' }}>
            <p><strong>質問{idx + 1}</strong></p>
            <p><strong>対象項目:</strong> {evalItem.grit_item}（{evalItem.grit_item_name}）</p>
            <p><strong>スコア:</strong> {evalItem.score}</p>
            <p><strong>コメント:</strong> {evalItem.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
