// pages/index.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import axios from 'axios';

// 型定義

type Role = 'user' | 'assistant';

interface Message {
  role: Role;
  content: string;
  isRetryPrompt?: boolean;
}

interface GritScore {
  perseverance: number;
  passion: number;
  goal_orientation: number;
  resilience: number;
}

interface ScoreChange {
  score: GritScore;
  relatedFactors: string[];
  userAnswer: string;
}

const labelMap: Record<keyof GritScore, string> = {
  perseverance: '粘り強さ',
  passion: '情熱',
  goal_orientation: '目標志向性',
  resilience: '回復力',
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scoreHistory, setScoreHistory] = useState<ScoreChange[]>([]);
  const [retryState, setRetryState] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadInitialQuestion = async () => {
      try {
        const res = await axios.post('/api/generate-question', {
          history: []
        });
        setMessages([{ role: 'assistant', content: res.data.question }]);
      } catch {
        setError('初回の質問取得に失敗しました。');
      }
    };
    loadInitialQuestion();
  }, []);

  const isValidAnswer = (messages: Message[], index: number): boolean => {
    const prev = messages[index - 1];
    const prev2 = messages[index - 2];
    return !(prev?.isRetryPrompt || prev2?.isRetryPrompt);
  };

  const countRealAnswers = (messages: Message[]): number => {
    return messages.reduce((count, msg, i) => {
      if (msg.role === 'user' && isValidAnswer(messages, i)) {
        return count + 1;
      }
      return count;
    }, 0);
  };

  const calculateAverageScore = (history: ScoreChange[]): GritScore => {
    const total = history.reduce(
      (acc, item) => {
        acc.perseverance += item.score.perseverance;
        acc.passion += item.score.passion;
        acc.goal_orientation += item.score.goal_orientation;
        acc.resilience += item.score.resilience;
        return acc;
      },
      { perseverance: 0, passion: 0, goal_orientation: 0, resilience: 0 }
    );

    const count = history.length || 1;

    return {
      perseverance: Math.round(total.perseverance / count),
      passion: Math.round(total.passion / count),
      goal_orientation: Math.round(total.goal_orientation / count),
      resilience: Math.round(total.resilience / count),
    };
  };

  const toHistory = (messages: Message[]): { question: string; answer: string }[] => {
    return messages
      .filter((m) => m.role === 'assistant' || m.role === 'user')
      .reduce((acc, msg) => {
        const last = acc[acc.length - 1];
        if (msg.role === 'assistant') {
          acc.push({ question: msg.content, answer: '' });
        } else if (last && last.answer === '') {
          last.answer = msg.content;
        }
        return acc;
      }, [] as { question: string; answer: string }[]);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const lastQuestion = messages.filter((m) => m.role === 'assistant' && !m.isRetryPrompt).slice(-1)[0]?.content || '';
      const validation = await axios.post('/api/validate-answer', {
        question: lastQuestion,
        answer: input,
      });

      if (!validation.data.valid && validation.data.needsRetry) {
        const retryPrompt: Message = {
          role: 'assistant',
          content: 'もう一度、しっかり答えていただけますか？',
          isRetryPrompt: true
        };
        setMessages([...updatedMessages, retryPrompt]);
        setRetryState(true);
        setLoading(false);
        return;
      }

      const realAnswersCount = countRealAnswers(updatedMessages);

      const scoreRes = await axios.post('/api/evaluate-grit', {
        messages: updatedMessages
      });
      const newScore: GritScore = scoreRes.data.score;
      const newFactors: string[] = scoreRes.data.relatedFactors || [];

      setScoreHistory(prev => [...prev, {
        score: newScore,
        relatedFactors: newFactors,
        userAnswer: input
      }]);

      if (realAnswersCount >= 5) {
        const closingMessage = 'ご協力ありがとうございました。これでインタビューは終了です。お疲れ様でした。';
        setMessages([...updatedMessages, { role: 'assistant', content: closingMessage }]);
        setLoading(false);
        return;
      }

      const nextQuestionRes = await axios.post('/api/generate-question', {
        history: toHistory(updatedMessages)
      });
      const assistantMessage: Message = {
        role: 'assistant',
        content: nextQuestionRes.data.question,
      };
      setMessages([...updatedMessages, assistantMessage]);
      setRetryState(false);
    } catch (err) {
      setError('エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const showInput = (() => {
    const realQuestions = messages.filter((m) => m.role === 'assistant' && !m.isRetryPrompt);
    const realAnswersCount = countRealAnswers(messages);
    if (realQuestions.length >= 5 && realAnswersCount >= 5) return false;
    const lastQIndex = messages.findLastIndex((m) => m.role === 'assistant' && !m.isRetryPrompt);
    if (lastQIndex === -1) return true;
    const afterLastQ = messages.slice(lastQIndex + 1);
    const hasAnswer = afterLastQ.some((m) => m.role === 'user');
    const hasRetryPrompt = afterLastQ.some((m) => m.role === 'assistant' && m.isRetryPrompt);
    return !hasAnswer || hasRetryPrompt;
  })();

  const currentScore = calculateAverageScore(scoreHistory);

  return (
    <>
      <Head>
        <title>{process.env.NEXT_PUBLIC_APP_TITLE || 'GRIT測定アプリ'}</title>
      </Head>

      <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
        <div style={{ flex: 2 }}>
          <h1>GRIT測定インタビュー</h1>
          {messages.map((msg, idx) => {
            const isQ = msg.role === 'assistant';
            const isClosing = isQ && (msg.content.includes('以上で質問は終了') || msg.content.includes('インタビューは終了'));
            const qNum = messages.slice(0, idx).filter(m => m.role === 'assistant' && !m.isRetryPrompt && !isClosing).length;
            return (
              <div key={idx} style={{ marginBottom: '1rem' }}>
                <strong>{isQ && !isClosing && !msg.isRetryPrompt ? `Q: 質問 ${qNum + 1} / 5` : !isQ ? 'A:' : ''}</strong>{' '}
                {msg.content}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
          {error && <div style={{ color: 'red' }}>{error}</div>}
          {showInput && (
            <div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ここに回答を入力してください"
                rows={3}
                style={{ width: '100%', marginBottom: '1rem' }}
              />
              <button onClick={handleSubmit}>送信</button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
          <strong>現在のGRITスコア</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
            {(Object.keys(currentScore) as (keyof GritScore)[]).map((key) => (
              <li key={key}>{labelMap[key]}: {currentScore[key]} / 5</li>
            ))}
          </ul>
          <hr style={{ margin: '1rem 0' }} />
          <strong>スコア変動履歴</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
            {scoreHistory.map((entry, idx) => (
              <li key={idx} style={{ marginBottom: '0.5rem' }}>
                <div>回答 {idx + 1}: 「{entry.userAnswer.slice(0, 20)}...」</div>
                <div>影響要素: {entry.relatedFactors.length > 0 ? entry.relatedFactors.map(f => labelMap[f as keyof GritScore]).join(', ') : 'なし'}</div>
                <div>絶対評価: {
                  Object.entries(entry.score)
                    .map(([key, val]) => `${labelMap[key as keyof GritScore]}: ${val}`)
                    .join(', ')
                }</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
