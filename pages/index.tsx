// /pages/index.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

type Role = 'user' | 'assistant';

interface Message {
  role: Role;
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [evaluatedItems, setEvaluatedItems] = useState<number[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const initialQuestion = 'これまでに、どうしてもやり遂げたいと思って粘り強く取り組んだ長期的な目標やプロジェクトがあれば教えてください。その際に直面した最も大きな困難と、それをどう乗り越えたかを詳しく聞かせてください。';

  useEffect(() => {
    setMessages([{ role: 'assistant', content: initialQuestion }]);
  }, []);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!answer.trim()) return;

    setIsLoading(true);
    const updatedMessages: Message[] = [...messages, { role: 'user', content: answer }];
    setMessages(updatedMessages);

    try {
      const evalRes = await axios.post('/api/assistant', {
        answer,
        evaluatedItems,
      });

      const nextQuestion = evalRes.data.question;

      setMessages(prev => [...prev, { role: 'assistant', content: nextQuestion }]);
      setQuestionIndex(prev => prev + 1);
      setEvaluatedItems(prev => [...prev, questionIndex]);
    } catch (error) {
      console.error('通信エラー:', error);
    }

    setAnswer('');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-4">
        <h1 className="text-2xl font-bold mb-4">GRIT測定インタビュー</h1>
        <div ref={chatContainerRef} className="h-96 overflow-y-auto border p-3 mb-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 p-2 rounded ${msg.role === 'assistant' ? 'bg-blue-100 text-left' : 'bg-green-100 text-right'}`}
            >
              <span className="block text-sm text-gray-600">
                {msg.role === 'assistant' ? `質問 ${Math.ceil(idx / 2)}` : 'あなた'}
              </span>
              <div className="mt-1">{msg.content}</div>
            </div>
          ))}
        </div>

        <div className="flex">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-grow border border-gray-300 rounded-l px-3 py-2"
            placeholder="回答を入力..."
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 disabled:opacity-50"
          >
            送信
          </button>
        </div>

        <div className="text-sm text-gray-500 mt-2">質問 {questionIndex} / 12</div>
      </div>
    </div>
  );
}
