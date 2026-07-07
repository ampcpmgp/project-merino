// ファイル I/O — パス制限付き
import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

// 許可するルートパス
const ALLOWED_ROOTS = [
  '/workspace/private',
  '/workspace/private/htmx-data',
  '/workspace/private/htmx-app/scripts',
  '/workspace/public',
]

// 読み取り専用パス（Docker built-in の参照用）
const READONLY_ROOTS = [
  '/home/appuser/app',
  '/home/appuser/brain',
]

function resolvePath(relativePath: string): string {
  // 絶対パスの場合はそのまま、相対パスは /workspace/private をベースに
  if (relativePath.startsWith('/')) return relativePath
  return join('/workspace/private', relativePath)
}

function isAllowed(fullPath: string): { allowed: boolean; readonly: boolean } {
  for (const root of ALLOWED_ROOTS) {
    if (fullPath.startsWith(root)) return { allowed: true, readonly: false }
  }
  for (const root of READONLY_ROOTS) {
    if (fullPath.startsWith(root)) return { allowed: true, readonly: true }
  }
  return { allowed: false, readonly: false }
}

export async function readFileSafe(relativePath: string): Promise<string> {
  const fullPath = resolvePath(relativePath)
  const { allowed } = isAllowed(fullPath)
  if (!allowed) throw new Error(`Forbidden path: ${fullPath}`)
  return await readFile(fullPath, 'utf-8')
}

export async function writeFileSafe(relativePath: string, content: string): Promise<void> {
  const fullPath = resolvePath(relativePath)
  const { allowed, readonly } = isAllowed(fullPath)
  if (!allowed) throw new Error(`Forbidden path: ${fullPath}`)
  if (readonly) throw new Error(`Read-only path: ${fullPath}`)
  await mkdir(fullPath.replace(/\/[^/]+$/, ''), { recursive: true })
  await writeFile(fullPath, content, 'utf-8')
}

export async function listDir(relativePath: string): Promise<string[]> {
  const fullPath = resolvePath(relativePath)
  const { allowed } = isAllowed(fullPath)
  if (!allowed) throw new Error(`Forbidden path: ${fullPath}`)
  return await readdir(fullPath)
}

export async function fileInfo(relativePath: string): Promise<{ name: string; size: number; mtime: Date }> {
  const fullPath = resolvePath(relativePath)
  const { allowed } = isAllowed(fullPath)
  if (!allowed) throw new Error(`Forbidden path: ${fullPath}`)
  const s = await stat(fullPath)
  return { name: fullPath.split('/').pop() ?? '', size: s.size, mtime: s.mtime }
}
