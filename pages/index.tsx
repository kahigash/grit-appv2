'use client';

import { useState } from 'react';
import axios from 'axios';

interface Evaluation {
  grit_item: number;
  score: number;
  comment: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [questionIndex, setQuestionIndex] = useState(1);
  const [question, setQuestion] = useState(
    'これまでに、どうしてもやり遂げたいと思って粘り強く取り組んだ長期的な目標やプロジェクトがあれば教えてください。その際に直面した最も大きな困難と、それをどう乗り越えたかを詳しく聞かせてください。'
  );
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: question },
  ]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setEvaluation(null);

    try {
      // 回答を送信して記録
      const updatedMessages = [...messages, { role: 'user', content: answer }];
      setMessages(updatedMessages);

      // 1. 回答の評価を取得
      const evalRes = await axios.post('/api/assistant', { answer });
      setEvaluation(evalRes.data);

      // 2. 次の質問を取得（5問目まで）
      if (questionIndex < 5) {
        const genRes = await axios.post('/api/generate-question', {
          messages: updatedMessages,
        });
        const newQuestion = genRes.data.result;

        setQuestion(newQuestion);
        setMessages([...updatedMessages, { role: 'assistant', content: newQuestion }]);
        setQuestionIndex((prev) => prev + 1);
        setAnswer('');
      } else {
        setQuestion('全ての質問が終了しました。ご協力ありがとうございました。');
        setAnswer('');
      }
    } catch (err: any) {
      console.error(err);
      setError('通信エラー：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
      {/* 左：チャット形式の質問と回答 */}
      <div style={{ flex: 2 }}>
        <h2>GRITチャット</h2>
        <p>
          <strong>Q: 質問 {questionIndex} / 5</strong> {question}
        </p>
        {evaluation && (
          <p>
            <strong>A:</strong> {answer}
          </p>
        )}
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          style={{ width: '100%', marginTop: '1rem' }}
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
            <p><strong>項目:</strong> {evaluation.grit_item}</p>
            <p><strong>スコア:</strong> {evaluation.score}</p>
            <p><strong>コメント:</strong> {evaluation.comment}</p>
          </div>
        )}
      </div>
    </div>
  );
}
