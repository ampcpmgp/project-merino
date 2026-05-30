# Whiteboard

Excalidrawを使ったホワイトボードアプリケーション。

## 構成

whiteboard/
├── client/      # Excalidraw フロントエンド (Vite + React + Bun)
├── server/      # Hocuspocus サーバー (Yjs + SQLite)
├── storage/     # Storage API (Bun)
└── start.sh     # 全サービス起動スクリプト

## アーキテクチャ

Client (React) <--WebSocket--> Hocuspocus Server <--SQLite--> db.sqlite
     |
     | HTTP
     v
Storage API

## ポート構成

| ポート | サービス | 説明 |
|--------|---------|------|
| 3101 | Excalidraw client | React + Vite フロントエンド |
| 3102 | Hocuspocus | WebSocketリアルタイム同期 + SQLite永続化 |
| 3103 | Storage API | Bun + TypeScript 永続化API（履歴管理） |
| 3100 | Nginx | Whiteboard統合アクセスポート（オプション） |

## 必要条件

- Bun 1.3+

curl -fsSL https://bun.sh/install | bash

## クイックスタート

cd whiteboard
bun install
bun run dev

アクセス: http://localhost:3101

## 起動方法

### 全サービス一括起動（推奨）

bun run dev

### 個別に起動

bun run dev:client   # フロントエンド (3101)
bun run dev:server   # Hocuspocusサーバー (3102)
bun run dev:storage  # Storage API (3103)

### 停止

bun run stop
# または Ctrl+C

## 技術スタック

### リアルタイム同期
- Yjs: CRDTライブラリ
- Hocuspocus: Yjs用WebSocketサーバー（Tiptap製）
- SQLite: 自動永続化（Hocuspocus拡張）

### フロントエンド
- React 19, Vite 8
- @excalidraw/excalidraw 0.18.0
- @hocuspocus/provider 2.15

### バックエンド
- @hocuspocus/server 2.15
- @hocuspocus/extension-sqlite 2.15
- Bun runtime

## なぜHocuspocusか

y-websocket v3.xではサーバーバイナリが削除されました。Hocuspocusは：

- SQLite永続化が組み込み（設定不要）
- Tiptapチームがメンテナンス（活発）
- Webhook/認証の拡張性
- Yjsと完全互換

## 注意事項

- Hocuspocusは自動的に `./server/db.sqlite` にデータを永続化
- Storage APIは履歴管理用（Hocuspocusとは別）
- HTTPS必須機能あり（共同編集はHTTPS環境でないと動作しない）

## データ保存場所

| サービス | 保存場所 | 内容 |
|---------|---------|------|
| Hocuspocus | `./server/db.sqlite` | リアルタイム同期データ |
| Storage API | `./storage/drawings/` | JSONファイル（履歴含む） |
