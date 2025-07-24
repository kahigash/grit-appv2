'use client';

import { useState } from 'react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Evaluation {
  grit_item: number;
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
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    setLoading(true);
    setError('');
    setEvaluation(null);

    try {
      // 1. 回答を送信して記録
      const updatedMessages: Message[] = [...messages, { role: 'user' as const, content: answer }];
      setMessages(updatedMessages);

      // 2. 評価取得
      const evalRes = await axios.post('/api/assistant', { answer });
      setEvaluation(evalRes.data);

      // 3. 次の質問を取得（generate-question.ts経由）
      const questionRes = await axios.post('/api/generate-question', {
        messages: updatedMessages,
      });
      const nextQuestion = questionRes.data.result;

      // 4. 質問を記録
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: nextQuestion }]);

      // 5. カウントを進める
      setQuestionIndex((prev) => prev + 1);

      // 6. 入力欄をクリア
      setAnswer('');
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

      {/* 右：評価スコア表示 */}
      <div style={{ flex: 1 }}>
        <h3>評価スコア</h3>
        {evaluation && (
          <div>
            <p>
              <strong>項目:</strong> {evaluation.grit_item}
            </p>
            <p>
              <strong>スコア:</strong> {evaluation.score}
            </p>
            <p>
              <strong>コメント:</strong> {evaluation.comment}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
