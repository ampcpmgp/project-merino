// 認証情報抽出 — Nginx X-Forwarded-User ヘッダーから取得
import type { Context } from 'hono'

export interface AuthInfo {
  username: string | null
  isAuthenticated: boolean
}

export function getAuth(c: Context): AuthInfo {
  const user = c.req.header('X-Forwarded-User') || null
  return {
    username: user,
    isAuthenticated: user !== null,
  }
}
