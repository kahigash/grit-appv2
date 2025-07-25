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
  const [evaluatedItems, setEvaluatedItems] = useState<number[]>([1]); // 初期Qは項目1想定

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    setLoading(true);
    setError('');
    setEvaluation(null);

    try {
      const updatedMessages: Message[] = [...messages, { role: 'user' as const, content: answer }];
      setMessages(updatedMessages);

      // 評価API呼び出し
      const evalRes = await axios.post('/api/assistant', { answer });
      setEvaluation(evalRes.data);

      // 評価済み項目を追加
      const newItem = evalRes.data.grit_item;
      if (!evaluatedItems.includes(newItem)) {
        setEvaluatedItems((prev) => [...prev, newItem]);
      }

      // 次の質問生成API
      const questionRes = await axios.post('/api/generate-question', {
        messages: updatedMessages,
        evaluatedItems: [...evaluatedItems, newItem],
      });
      const nextQuestion = questionRes.data.result;

      setMessages((prev) => [...prev, { role: 'assistant' as const, content: nextQuestion }]);
      setQuestionIndex((prev) => prev + 1);
      setAnswer('');
    } catch (err: any) {
      setError('通信エラー：' + (err?.message || '不明なエラー'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
      {/* 左：チャット履歴 */}
      <div style={{ flex: 2 }}>
        <h2>GRITチャット</h2>
        {messages.map((msg, idx) => (
          <p key={idx}>
            <strong>{msg.role === 'assistant' ? `Q: 質問 ${Math.ceil((idx + 1) / 2)} / 12` : 'A:'}</strong>{' '}
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

      {/* 右：評価スコア */}
      <div style={{ flex: 1 }}>
        <h3>評価スコア</h3>
        {evaluation && (
          <div>
            <p><strong>項目:</strong> {evaluation.grit_item}</p>
            <p><strong>スコア:</strong> {evaluation.score}</p>
            <p><strong>コメント:</strong> {evaluation.comment}</p>
          </div>
        )}
      </div>
    </div>
  );
}
