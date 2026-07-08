import { Hono } from 'hono'
import { serve } from 'bun'

const PORT = parseInt(process.env.HTMX_APP_PORT || '3200')

const app = new Hono()

// ── Hermes AI チャット（hermes CLI 経由）──
app.post('/hermes/form', async (c) => {
  try {
    const body = await c.req.parseBody()
    const prompt = (body.prompt as string) || ''
    if (!prompt) return c.html('<p style="color:red">No prompt</p>')
    const content = await askHermes(prompt)
    return c.html(`<pre>${escapeHtml(content)}</pre>`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[hermes/form] Error:', msg)
    return c.html(`<pre style="color:red">Error: ${escapeHtml(msg)}</pre>`)
  }
})

// ── カスタムスクリプト実行 ──
app.post('/exec/:name', async (c) => {
  const name = c.req.param('name')
  const dirs = ['/workspace/private/html-api/scripts', '/home/appuser/app/html-api/scripts-sample']
  let lastErr = ''
  for (const dir of dirs) {
    const scriptPath = `${dir}/${name}.ts`
    try {
      const mod = await import(scriptPath)
      const result = await mod.default(c)
      const html = typeof result === 'string' ? result : JSON.stringify(result)
      return c.html(`<pre>${html}</pre>`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Cannot find module')) {
        lastErr = msg
        continue
      }
      return c.html(`<pre style="color:red">Script error (${name}): ${escapeHtml(msg)}</pre>`)
    }
  }
  return c.html(`<pre style="color:red">Script '${name}' not found in any directory.</pre>`)
})

// ── ファイル読み取り ──
app.get('/read', async (c) => {
  const path = c.req.query('path') || ''
  const fullPath = `/workspace/private/${path}`
  try {
    const content = await Bun.file(fullPath).text()
    return c.html(`<pre>${escapeHtml(content)}</pre>`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.html(`<pre style="color:red">Error: ${escapeHtml(msg)}</pre>`)
  }
})

// ── CORS ──
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  await next()
})

// ── ステータス ──
app.get('/ping', (c) => c.text('ok'))

// ── Hermes CLI 呼び出し ──
async function askHermes(prompt: string): Promise<string> {
  const proc = Bun.spawn(['hermes', 'chat', '-q', prompt, '--quiet'], {
    env: { ...process.env },
    timeout: 120_000,
  })
  const stdout = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(`hermes exited ${exitCode}: ${stderr.trim()}`)
  }
  // 1行目は "session_id: xxx" なのでスキップ
  const lines = stdout.trim().split('\n')
  if (lines[0]?.startsWith('session_id:')) {
    return lines.slice(1).join('\n').trim()
  }
  return stdout.trim()
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

serve({ port: PORT, fetch: app.fetch })
console.log(`[html-api] Running on http://localhost:${PORT}`)
