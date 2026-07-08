import { Hono } from 'hono'
import { serve } from 'bun'
import { spawn } from 'child_process'

const PORT = parseInt(process.env.HTMX_APP_PORT || '3200')

const app = new Hono()

// ── セッション状態 ──
let currentSessionId = ''

// ═══════════════════════════════════════════
// JSON API — `/api/` 配下はすべて JSON 応答
// ═══════════════════════════════════════════

// ── Hermes AI チャット ──
app.post('/api/hermes/form', async (c) => {
  try {
    const { prompt } = await c.req.json()
    if (!prompt) return c.json({ ok: false, error: 'No prompt' })
    const { response, sessionId } = await askHermes(prompt, currentSessionId)
    const hadSession = !!currentSessionId
    currentSessionId = sessionId || currentSessionId
    return c.json({ ok: true, response, session_active: !hadSession || !!currentSessionId })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[api/hermes/form] Error:', msg)
    return c.json({ ok: false, error: msg })
  }
})

// ── 新規会話 ──
app.post('/api/hermes/new', async (c) => {
  currentSessionId = ''
  return c.json({ ok: true, session_active: false })
})

// ── カスタムスクリプト実行 ──
app.post('/api/exec/:name', async (c) => {
  const name = c.req.param('name')
  const dirs = ['/workspace/private/html-api/scripts', '/home/appuser/app/html-api/scripts-sample']
  for (const dir of dirs) {
    const scriptPath = `${dir}/${name}.ts`
    try {
      const mod = await import(scriptPath)
      const result = await mod.default(c)
      const html = typeof result === 'string' ? result : JSON.stringify(result)
      return c.json({ ok: true, html: `<pre>${html}</pre>` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Cannot find module')) continue
      return c.json({ ok: false, error: msg })
    }
  }
  return c.json({ ok: false, error: `Script '${name}' not found` })
})

// ── ファイル読み取り ──
app.get('/api/read', async (c) => {
  const path = c.req.query('path') || ''
  const fullPath = `/workspace/private/${path}`
  try {
    const content = await Bun.file(fullPath).text()
    return c.json({ ok: true, content })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg })
  }
})

// ── Ping ──
app.get('/api/ping', (c) => c.json({ ok: true }))

// ═══════════════════════════════════════════
// 旧来の HTML エンドポイント（非推奨）
// 移行完了後削除予定
// ═══════════════════════════════════════════

app.post('/hermes/form', async (c) => {
  const body = await c.req.parseBody()
  const prompt = (body.prompt as string) || ''
  if (!prompt) return c.html('<p style="color:red">No prompt</p>')
  try {
    const { response, sessionId } = await askHermes(prompt, currentSessionId)
    currentSessionId = sessionId || currentSessionId
    return c.html(`<pre>${escapeHtml(response)}</pre>`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.html(`<pre style="color:red">Error: ${escapeHtml(msg)}</pre>`)
  }
})

app.post('/hermes/new', async () => {
  currentSessionId = ''
  return c.html('<p>🆕 新しい会話</p>')
})

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

app.post('/exec/:name', async (c) => {
  const name = c.req.param('name')
  const dirs = ['/workspace/private/html-api/scripts', '/home/appuser/app/html-api/scripts-sample']
  for (const dir of dirs) {
    const scriptPath = `${dir}/${name}.ts`
    try {
      const mod = await import(scriptPath)
      const result = await mod.default(c)
      const html = typeof result === 'string' ? result : JSON.stringify(result)
      return c.html(`<pre>${html}</pre>`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Cannot find module')) continue
      return c.html(`<pre style="color:red">Script error: ${escapeHtml(msg)}</pre>`)
    }
  }
  return c.html(`<pre style="color:red">Script not found</pre>`)
})

app.get('/ping', (c) => c.text('ok'))

// ── CORS ──
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  await next()
})

// ── Hermes CLI 呼び出し ──
async function askHermes(prompt: string, sessionId: string): Promise<{ response: string; sessionId: string }> {
  const args = ['chat', '-q', prompt, '--quiet']
  if (sessionId) args.push('--resume', sessionId)

  const proc = spawn('hermes', args, {
    env: { ...process.env, HOME: process.env.HOME || '/home/appuser' },
    timeout: 120_000,
  })

  const [stdout, stderr] = await Promise.all([
    new Promise<string>((resolve) => { let d = ''; proc.stdout!.on('data', (c: Buffer) => d += c); proc.stdout!.on('end', () => resolve(d)) }),
    new Promise<string>((resolve) => { let d = ''; proc.stderr!.on('data', (c: Buffer) => d += c); proc.stderr!.on('end', () => resolve(d)) }),
  ])
  const exitCode = await new Promise<number>((resolve) => proc.on('close', resolve))

  if (exitCode !== 0) {
    throw new Error(`hermes exited ${exitCode}: ${(stderr || stdout).trim()}`)
  }

  let extractedSessionId = sessionId
  for (const line of stderr.split('\n')) {
    const t = line.trim()
    if (t.startsWith('session_id:')) extractedSessionId = t.replace(/^session_id:\s*/, '').trim()
  }
  return { response: stdout.trim(), sessionId: extractedSessionId }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

serve({ port: PORT, fetch: app.fetch })
console.log(`[html-api] Running on http://localhost:${PORT}`)
