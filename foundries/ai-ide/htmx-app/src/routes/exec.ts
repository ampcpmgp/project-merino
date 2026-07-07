// exec エンドポイント — スクリプト実行
import { Hono } from 'hono'
import { runTool, discoverTools } from '../services/loader'

export const exec = new Hono()

// フォームからスクリプト実行
exec.post('/', async (c) => {
  const body = await c.req.parseBody()
  const scriptName = (body.script as string) || ''
  const argsStr = (body.args as string) || ''

  if (!scriptName) {
    return c.html('<pre style="color:#e53e3e;">Error: No script selected</pre>')
  }

  const args = argsStr ? argsStr.split(/\s+/) : []

  try {
    const result = await runTool(scriptName, args)
    return c.html(`<pre>${escapeHtml(result)}</pre>`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.html(`<pre style="color:#e53e3e;">Error: ${escapeHtml(msg)}</pre>`)
  }
})

// POST /run — JSON ベース（API 用）
exec.post('/run', async (c) => {
  const { script, args } = await c.req.json()
  if (!script) return c.json({ error: 'No script specified' }, 400)

  try {
    const result = await runTool(script, args || [])
    return c.html(`<pre>${escapeHtml(result)}</pre>`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.html(`<pre style="color:#e53e3e;">Error: ${escapeHtml(msg)}</pre>`)
  }
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
