// ファイル I/O エンドポイント — htmx からのファイル操作
import { Hono } from 'hono'
import { readFileSafe, writeFileSafe, listDir, fileInfo } from '../services/filesystem'

export const files = new Hono()

// ファイル一覧（ディレクトリ）
files.get('/list', async (c) => {
  const path = c.req.query('path') || ''
  try {
    const entries = await listDir(path)
    const items = await Promise.all(
      entries.map(async (name) => {
        const info = await fileInfo(`${path}/${name}`)
        return `<tr><td>${name}</td><td>${info.size}</td><td>${info.mtime.toISOString()}</td></tr>`
      })
    )
    return c.html(`<table border="1" cellpadding="4">
      <tr><th>Name</th><th>Size</th><th>Modified</th></tr>
      ${items.join('\n')}
    </table>`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.html(`<pre style="color:#e53e3e;">Error: ${msg}</pre>`)
  }
})

// ファイル読み取り
files.get('/read', async (c) => {
  const path = c.req.query('path') || ''
  try {
    const content = await readFileSafe(path)
    return c.html(`<pre>${escapeHtml(content)}</pre>`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.html(`<pre style="color:#e53e3e;">Error: ${msg}</pre>`)
  }
})

// ファイル書き込み（POST）
files.post('/write', async (c) => {
  const { path, content } = await c.req.json()
  try {
    await writeFileSafe(path, content)
    return c.html(`<pre style="color:#38a169;">✅ Written: ${path}</pre>`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.html(`<pre style="color:#e53e3e;">Error: ${msg}</pre>`)
  }
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
