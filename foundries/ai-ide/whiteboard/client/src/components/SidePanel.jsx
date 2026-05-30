import React, { useState, useEffect, useRef, useCallback } from 'react';
import { saveToStorage, loadFromStorage, getHistory } from '../lib/api';

const PANEL_CONTENT_WIDTH = 280;
const TOGGLE_BUTTON_WIDTH = 32;
const PANEL_WIDTH_OPEN = PANEL_CONTENT_WIDTH + TOGGLE_BUTTON_WIDTH;
const PANEL_WIDTH_CLOSED = TOGGLE_BUTTON_WIDTH;

export function SidePanel({ isOpen, onToggle, roomId, elements, files, onLoad }) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(true);
  const timeoutRef = useRef(null);

  // メッセージを一時的に表示
  const showMessage = useCallback((msg, duration = 3000) => {
    clearTimeout(timeoutRef.current);
    setMessage(msg);
    timeoutRef.current = setTimeout(() => setMessage(''), duration);
  }, []);

  // コンポーネントアンマウント時にタイムアウトをクリア
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  // 履歴一覧を取得
  const fetchHistory = useCallback(async () => {
    try {
      const data = await getHistory(roomId);
      setHistory(data.history || []);
    } catch (err) {
      console.error('履歴取得失敗:', err);
      setHistory([]);
      showMessage('履歴の読み込みに失敗しました');
    }
  }, [roomId, showMessage]);

  // 初回表示時とroomId変更時に履歴を取得
  useEffect(() => {
    fetchHistory();
    setLastSaved(null);
  }, [fetchHistory]);

  // 保存ボタン押下
  const handleSave = async () => {
    if (elements.length === 0) {
      showMessage('保存する要素がありません');
      return;
    }

    setIsSaving(true);
    setMessage('');
    
    try {
      const data = await saveToStorage(roomId, elements, files);
      setLastSaved(new Date(data.timestamp).toLocaleString());
      showMessage('保存しました');
      fetchHistory(); // 履歴を更新
    } catch (err) {
      console.error('保存失敗:', err);
      showMessage('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 履歴から読み込み
  const handleLoad = async (timestamp) => {
    try {
      const data = await loadFromStorage(roomId, timestamp);
      if (data?.elements) {
        onLoad(data.elements, data.files || {});
        showMessage('読み込みました');
      }
    } catch (err) {
      console.error('読み込み失敗:', err);
      showMessage('読み込みに失敗しました');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: isOpen ? `${PANEL_WIDTH_OPEN}px` : `${PANEL_WIDTH_CLOSED}px`,
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        zIndex: 9999,
        transition: 'width 0.15s ease-out',
      }}
    >
      {/* トグルボタン（左側面） */}
      <button
        onClick={onToggle}
        style={{
          width: `${TOGGLE_BUTTON_WIDTH}px`,
          height: '100%',
          background: '#4CAF50',
          border: 'none',
          borderLeft: '1px solid #388E3C',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          flexShrink: 0,
          zIndex: 10000,
        }}
      >
        {isOpen ? '>>' : '<<'}
      </button>

      {/* パネルコンテンツ（右側） */}
      {isOpen && (
        <div
          style={{
            width: `${PANEL_CONTENT_WIDTH}px`,
            height: '100%',
            background: '#f7fafc',
            borderLeft: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* セクションヘッダー */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e0e0e0',
            background: '#fff',
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              room: {roomId}
            </p>
          </div>

          {/* コンテンツエリア（スクローラブル） */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* 保存・履歴アコーディオン */}
            <div style={{ borderBottom: '1px solid #e0e0e0' }}>
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: isHistoryOpen ? '#f0f4ff' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isHistoryOpen ? '#4a5568' : '#2d3748',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f7fafc'; }}
                onMouseLeave={(e) => { if (!isHistoryOpen) e.currentTarget.style.background = '#fff'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>💾</span>
                  保存・履歴
                </span>
                <span style={{
                  transform: isHistoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  color: '#a0aec0',
                  fontSize: '12px',
                }}>▼</span>
              </button>
              
              {isHistoryOpen && (
                <div style={{ padding: '16px', background: '#f8fafc' }}>
                  {/* 永続ストレージに保存 */}
                  <div style={{ marginBottom: '16px' }}>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: isSaving ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        boxShadow: isSaving ? 'none' : '0 4px 6px rgba(102, 126, 234, 0.3)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isSaving ? '保存中...' : '💾 永続ストレージに保存'}
                    </button>
                    
                    {lastSaved && (
                      <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#666' }}>
                        最終保存: {lastSaved}
                      </p>
                    )}
                    
                    {message && (
                      <p style={{
                        margin: '8px 0 0 0',
                        fontSize: '11px',
                        color: message.includes('失敗') ? '#f44336' : '#4CAF50',
                        fontWeight: 'bold',
                      }}>
                        {message}
                      </p>
                    )}
                  </div>

                  {/* 保存履歴リスト */}
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>
                      保存履歴
                    </h3>
                    
                    {history.length === 0 ? (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        background: '#fff',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e0',
                      }}>
                        <p style={{ fontSize: '13px', color: '#a0aec0', margin: 0 }}>
                          📝 まだ履歴がありません
                        </p>
                      </div>
                    ) : (
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                      }}>
                        {history.map((item, index) => (
                          <li
                            key={item.timestamp}
                            style={{
                              padding: '12px',
                              marginBottom: '10px',
                              background: '#fff',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            }}
                          >
                            <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px', fontWeight: '500' }}>
                              {new Date(item.createdAt).toLocaleString()}
                            </div>
                            <button
                              onClick={() => handleLoad(item.timestamp)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                boxShadow: '0 2px 4px rgba(66, 153, 225, 0.3)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              📂 読み込む
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p style={{
                      margin: '16px 0 0 0',
                      fontSize: '11px',
                      color: '#a0aec0',
                      textAlign: 'center',
                    }}>
                      💾 最大30世代まで保持
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* AI連携アコーディオン */}
            <div style={{ borderBottom: '1px solid #e0e0e0' }}>
              <button
                onClick={() => setIsAiOpen(!isAiOpen)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: isAiOpen ? '#f0fff4' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isAiOpen ? '#4a5568' : '#2d3748',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f7fafc'; }}
                onMouseLeave={(e) => { if (!isAiOpen) e.currentTarget.style.background = '#fff'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🤖</span>
                  AI連携
                </span>
                <span style={{
                  transform: isAiOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  color: '#a0aec0',
                  fontSize: '12px',
                }}>▼</span>
              </button>
              
              {isAiOpen && (
                <div style={{ padding: '16px', background: '#f0fff4' }}>
                  <div style={{
                    padding: '20px',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '2px dashed #cbd5e0',
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '24px' }}>🚧</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#718096', fontWeight: '500' }}>
                      工事中
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#a0aec0' }}>
                      Coming Soon...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
