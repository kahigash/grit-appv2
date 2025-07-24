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
  const [questionIndex, setQuestionIndex] = useState(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'これまでに、どうしてもやり遂げたいと思って粘り強く取り組んだ長期的な目標やプロジェクトがあれば教えてください。その際に直面した最も大きな困難と、それをどう乗り越えたかを詳しく聞かせてください。',
    },
  ]);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    setLoading(true);
    setError('');
    setEvaluation(null);

    try {
      // 1. 回答を記録
      const updatedMessages: Message[] = [...messages, { role: 'user', content: answer }];
      setMessages(updatedMessages);

      // 2. 回答を評価
      const evalRes = await axios.post('/api/assistant', { answer });
      setEvaluation(evalRes.data);

      // 3. 次の質問を生成
      const questionRes = await axios.post('/api/generate-question', { messages: updatedMessages });
      const nextQuestion = questionRes.data.result;

      // 4. 質問を記録
      setMessages((prev) => [...prev, { role: 'assistant', content: nextQuestion }]);
      setQuestion(nextQuestion);
      setQuestionIndex((prev) => prev + 1);

      // 入力欄をクリア
      setAnswer('');
    } catch (err: any) {
      setError('通信エラー：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = messages.findLast((msg) => msg.role === 'assistant')?.content || '';

  return (
    <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
      {/* 左：チャット履歴 */}
      <div style={{ flex: 2 }}>
        <h2>GRITチャット</h2>
        {messages.map((msg, idx) => (
          <p key={idx}>
            <strong>{msg.role === 'assistant' ? `Q: 質問 ${Math.floor(idx / 2) + 1} / 5` : 'A:'}</strong> {msg.content}
          </p>
        ))}
        {questionIndex <= 5 && (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              style={{ width: '100%', marginTop: '1rem' }}
            />
            <br />
            <button onClick={handleSubmit} disabled={loading || !answer.trim()}>
              {loading ? '送信中...' : '送信'}
            </button>
          </>
        )}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      {/* 右：評価スコア */}
      <div style={{ flex: 1 }}>
        <h3>評価スコア</h3>
        {evaluation ? (
          <div>
            <p><strong>項目:</strong> {evaluation.grit_item}</p>
            <p><strong>スコア:</strong> {evaluation.score}</p>
            <p><strong>コメント:</strong> {evaluation.comment}</p>
          </div>
        ) : (
          <p>回答後に表示されます</p>
        )}
      </div>
    </div>
  );
}
