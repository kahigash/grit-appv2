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

const gritItemNameMap: Record<number, string> = {
  1: '注意散漫への対処力',
  2: '熱意の持続性',
  3: '長期集中力',
  4: '関心の安定性',
  5: '目標の一貫性',
  6: '関心の持続力',
  7: '没頭力',
  8: 'レジリエンス',
  9: '長期的継続力',
  10: '地道な努力の継続性',
  11: 'やり遂げ力',
  12: 'モチベーションの自己管理力',
};

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

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    if (evaluations.length >= 12) return; // 🔒 保険：13問目以降に進まない

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
        questionText: lastQuestion?.content || '',
        grit_item: lastQuestion?.grit_item,
      });

      setEvaluations(prev => [
        ...prev,
        {
          ...evalRes.data,
          grit_item_name: gritItemNameMap[evalRes.data.grit_item],
        }
      ]);

      const safeMessages: Message[] = [...updatedMessages];
      const usedGritItems = safeMessages
        .filter(m => m.role === 'assistant' && typeof m.grit_item === 'number')
        .map(m => m.grit_item);

      const questionRes = await axios.post('/api/generate-question', {
        messages: safeMessages,
        usedGritItems,
      });

     const { result: content, grit_item, grit_item_name, questionId } = questionRes.data;

      if (grit_item === null) {
        // ✅ すべて終了時：クロージングメッセージのみを追加（評価はしない）
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content }
        ]);
        setLoading(false);
        return;
      }

      // ✅ クロージング（12問目終了時）
      if (evaluations.length === 11) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content, grit_item, grit_item_name, questionId },
          { role: 'assistant', content: '以上で全12問の質問は終了です。ご回答ありがとうございました。' }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content, grit_item, grit_item_name, questionId }
        ]);
      }
    } catch (err: any) {
      console.error('❌ handleSubmit error:', err.message);
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
        
    {/* 回答入力欄と送信ボタン */}
{!loading && questionIndex <= 12 && (
  <div>
    <textarea
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
      rows={4}
      style={{ width: '100%', marginTop: '1rem' }}
      placeholder="ここに回答を入力してください"
    />
    <br />
    <button onClick={handleSubmit} disabled={!answer}>
      送信
    </button>
  </div>
)}

{/* ローディング中の表示 */}
{loading && (
  <p style={{ marginTop: '1rem', color: '#555' }}>次の質問を生成中です...</p>
)}

{/* エラー表示 */}
{error && <p style={{ color: 'red' }}>{error}</p>}

        {/* ✅ ボタン表示条件を修正：12問すべて評価済みの場合のみ */}
        {evaluations.length === 12 && (
          <button
            onClick={() => {
              const qaPairs = messages
                .reduce<string[]>((acc, msg, idx) => {
                  if (msg.role === 'assistant') {
                    const next = messages[idx + 1];
                    if (next?.role === 'user') {
                      acc.push(
                        `【質問${acc.length + 1}】\nQ: ${msg.content}\nA: ${next.content}`
                      );
                    }
                  }
                  return acc;
                }, [])
                .join('\n\n');

              localStorage.setItem('gritEvaluations', JSON.stringify(evaluations));
              localStorage.setItem('qaPairs', qaPairs);
              window.location.href = '/result';
            }}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            診断結果を確認する
          </button>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <h3>評価スコア</h3>
        {evaluations.map((evalItem, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '1rem',
              padding: '0.5rem',
              border: '1px solid #ccc',
              lineHeight: '1.3',
            }}
          >
            <p style={{ margin: '0.2rem 0' }}>
              <strong>質問{idx + 1}</strong>
            </p>
            <p style={{ margin: '0.2rem 0' }}>
              <strong>対象項目:</strong> {evalItem.grit_item}（{evalItem.grit_item_name}）
            </p>
            <p style={{ margin: '0.2rem 0' }}>
              <strong>スコア:</strong> {evalItem.score}
            </p>
            <p style={{ margin: '0.2rem 0' }}>
              <strong>コメント:</strong> {evalItem.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
