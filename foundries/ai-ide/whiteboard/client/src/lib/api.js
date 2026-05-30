// 保存（メイン + 履歴作成）
export async function saveToStorage(roomId, elements, files = {}) {
  const response = await fetch(`/api/v1/${roomId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elements, files }),
  });

  if (!response.ok) {
    throw new Error(`Save failed: ${response.status}`);
  }

  return response.json();
}

// 読み込み（最新）
export async function loadFromStorage(roomId, timestamp = null) {
  const url = timestamp
    ? `/api/v1/${roomId}?timestamp=${encodeURIComponent(timestamp)}`
    : `/api/v1/${roomId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Load failed: ${response.status}`);
  }

  return response.json();
}

// 履歴一覧取得
export async function getHistory(roomId) {
  const response = await fetch(`/api/v1/${roomId}/history`);

  if (!response.ok) {
    throw new Error(`Get history failed: ${response.status}`);
  }

  return response.json();
}
