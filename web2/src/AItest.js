import { GoogleGenAI } from '@google/genai';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AItest({
  defaultModel = 'gemini-2.5-flash',
  starter = '今天天氣晴朗 我想要去野餐 我是女生我適合穿什麼',
}) {
  const [model, setModel] = useState(defaultModel);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [rememberKey, setRememberKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  // Load key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved) setApiKey(saved);
  }, []);

  // Warm welcome + starter
  useEffect(() => {
    setHistory([{ role: 'model', parts: [{ text: '👋 這裡是 Gemini 小幫手，有什麼想聊的？' }] }]);
    if (starter) setInput(starter);
  }, [starter]);

  // auto-scroll to bottom
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history, loading]);

  const ai = useMemo(() => {
    try {
      return apiKey ? new GoogleGenAI({ apiKey }) : null;
    } catch {
      return null;
    }
  }, [apiKey]);

  async function sendMessage(message) {
    const content = (message ?? input).trim();
    if (!content || loading) return;
    if (!ai) {
      setError('請先輸入有效的 Gemini API Key');
      return;
    }

    setError('');
    setLoading(true);

    const newHistory = [...history, { role: 'user', parts: [{ text: content }] }];
    setHistory(newHistory);
    setInput('');

    try {
      const resp = await ai.models.generateContent({
        model,
        contents: newHistory,
      });

      const reply = resp.text || '[No content]';
      setHistory((h) => [...h, { role: 'model', parts: [{ text: reply }] }]);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>Gemini Chat（直連 SDK，不經 proxy）</div>

        {/* Controls */}
        <div style={styles.controls}>
          <label style={styles.label}>
            <span>Model</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="例如 gemini-2.5-flash、gemini-2.5-pro"
              style={styles.input}
            />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              模型名稱會隨時間更新，若錯誤請改成官方清單中的有效 ID。
            </div>
          </label>

          <label style={styles.label}>
            <span>Gemini API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                const v = e.target.value;
                setApiKey(v);
                if (rememberKey) localStorage.setItem('gemini_api_key', v);
              }}
              placeholder="貼上你的 API Key（只在本機瀏覽器儲存）"
              style={styles.input}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 6,
                fontSize: 12,
              }}
            >
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={(e) => {
                  setRememberKey(e.target.checked);
                  if (!e.target.checked) localStorage.removeItem('gemini_api_key');
                  else if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
                }}
              />
              <span>記住在本機（localStorage）</span>
            </label>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Demo 用法：在瀏覽器內保存 Key 僅供教學。正式環境請改走後端或使用安全限制的 Key。
            </div>
          </label>
        </div>

        {/* Messages */}
        <div ref={listRef} style={styles.messages}>
          {history.map((m, idx) => (
            <div
              key={idx}
              style={{
                ...styles.msg,
                ...(m.role === 'user' ? styles.user : styles.assistant),
              }}
            >
              <div style={styles.msgRole}>{m.role === 'user' ? 'You' : 'Gemini'}</div>
              <div style={styles.msgBody}>
                <ReactMarkdown>{m.parts.map((p) => p.text).join('\n')}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.msg, ...styles.assistant }}>
              <div style={styles.msgRole}>Gemini</div>
              <div style={styles.msgBody}>思考中…</div>
            </div>
          )}
        </div>

        {error && <div style={styles.error}>⚠ {error}</div>}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          style={styles.composer}
        >
          <input
            placeholder="輸入訊息，按 Enter 送出"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={styles.textInput}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !apiKey}
            style={styles.sendBtn}
          >
            送出
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 8,
          }}
        >
          {[
            '今天天氣下大雨 我想要去逛百貨公司 我是女生我適合穿什麼',
            '今天天氣好熱 但我需要去公司開會 我是男生我適合穿什麼',
            '今天天氣下雪 我想要去上學 我是男生我適合穿什麼',
          ].map((q) => (
            <button
              key={q}
              type="button"
              style={styles.suggestion}
              onClick={() => sendMessage(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'grid', placeItems: 'start', padding: 16 },
  card: {
    width: 'min(900px, 100%)',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    padding: '10px 12px',
    fontWeight: 700,
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  controls: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: '1fr 1fr',
    padding: 12,
  },
  label: { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    fontSize: 14,
  },
  messages: {
    padding: 12,
    display: 'grid',
    gap: 10,
    maxHeight: 420,
    overflow: 'auto',
  },
  msg: { borderRadius: 12, padding: 10, border: '1px solid #e5e7eb' },
  user: { background: '#eef2ff', borderColor: '#c7d2fe' },
  assistant: { background: '#f1f5f9', borderColor: '#e2e8f0' },
  msgRole: { fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 6 },
  msgBody: { fontSize: 14, lineHeight: 1.5 },
  error: { color: '#b91c1c', padding: '4px 12px' },
  composer: {
    padding: 12,
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 8,
    borderTop: '1px solid #e5e7eb',
  },
  textInput: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    fontSize: 14,
  },
  sendBtn: {
    padding: '10px 14px',
    borderRadius: 999,
    border: '1px solid #111827',
    background: '#111827',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
  },
  suggestion: {
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    cursor: 'pointer',
    fontSize: 12,
  },
};
