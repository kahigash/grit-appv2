
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
