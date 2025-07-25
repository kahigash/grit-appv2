'use client';

import { useState } from 'react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  questionId?: number;
  grit_item?: number;
  grit_item_name?: string;
}

interface Evaluation {
  grit_item: number;
  grit_item_name: string;
  score: number;
  comment: string;
}

export default function Home() {
  const initialQuestion: Message = {
    role: 'assistant',
    content: '仕事中に新しいアイデアが浮かんだとき、現在の作業とどうバランスをとりますか？',
    questionId: 1,
    grit_item: 1,
    grit_item_name: '注意散漫への対処力',
  };

  const [messages, setMessages] = useState<Message[]>([initialQuestion]);
  const [answer, setAnswer] = useState('');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    const currentAnswer = answer;
    setAnswer('');
    setLoading(true);
    setError('');

    try {
      const updatedMessages: Message[] = [...messages, { role: 'user', content: currentAnswer }];
      setMessages(updatedMessages);

      const lastQuestion = messages.slice().reverse().find(msg => msg.role === 'assistant');

      const evalRes = await axios.post('/api/assistant', {
        answer: currentAnswer,
        questionId: lastQuestion?.questionId,
        grit_item: lastQuestion?.grit_item,
        grit_item_name: lastQuestion?.grit_item_name,
      });

      setEvaluations(prev => [...prev, evalRes.data]);

      const questionRes = await axios.post('/api/generate-question', {
        messages: [...updatedMessages, lastQuestion].filter(Boolean),
      });

      const content = questionRes.data.result;
      const { grit_item, grit_item_name, questionId } = questionRes.data;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content,
          grit_item,
          grit_item_name,
          questionId,
        }
      ]);

      setQuestionIndex(prev => prev + 1);
    } catch (err: any) {
      setError('通信エラー：' + (err?.message || '不明なエラー'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
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
