# ai-ide

AI対応の統合開発環境（IDE）基盤。code-server, whiteboard, ストレージAPI を提供する。

## デフォルトポート

| ポート | サービス | 用途 |
|---|---|---|
| 8443 | code-server (code-server) | VS Code ベースの IDE（ブラウザ版） |
| 3100 | Whiteboard (Nginx) | Excalidraw フロントエンド + API 統合アクセス |
| 3102 | Hocuspocus | WebSocket リアルタイム同期 + SQLite 永続化 |
| 3103 | Storage API | Bun + Hono 永続化API（履歴管理/最大30世代） |

### アクセス

cloudflared 経由で `https://<your-domain>:3100` にアクセスするか、コンテナ内から `http://localhost:3100` でアクセスできます。

認証は code-server と同じパスワード（`NGINX_BASIC_PASSWORD`）を使用します。

### 技術スタック

- **フロントエンド**: React 19, Vite 8, @excalidraw/excalidraw 0.18.0
- **リアルタイム同期**: Yjs (CRDT) + Hocuspocus (WebSocket Server) + SQLite
- **ストレージ**: Bun + Hono + Zod (履歴管理・tar.gz バックアップ)
```
