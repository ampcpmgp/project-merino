import { Hono } from 'hono'
import { serve } from 'bun'
import { spawn } from 'child_process'

const PORT = parseInt(process.env.HTMX_APP_PORT || '3200')

const app = new Hono()

// ── セッション状態 ──
let currentSessionId = ''

// ── OOB フラグメント: セッション中（Ask Hermes + New Chat）──
function sessionButtonsOob(): string {
  return `<span id="form-buttons" hx-swap-oob="innerHTML">\
<button type="submit" class="btn-primary btn-loader">Ask Hermes</button>\
<button type="button" class="btn-outline btn-loader" \
hx-post="/html-api/hermes/new" \
hx-target="#hermes-output" \
onclick="document.getElementById('session-badge').textContent='🆕 新しい会話'">New Chat</button>\
</span>`
}

// ── OOB フラグメント: 初期状態（New Chat のみ）──
function initialButtonsOob(): string {
  return `<span id="form-buttons" hx-swap-oob="innerHTML">\
<button type="submit" class="btn-primary btn-loader">New Chat</button>\
</span>`
}

// ── Hermes AI チャット（会話セッション継続）──
app.post('/hermes/form', async (c) => {
  try {
    const body = await c.req.parseBody()
    const prompt = (body.prompt as string) || ''
    if (!prompt) return c.html('<p style="color:red">No prompt</p>')
    const hadSession = !!currentSessionId
    const { response, sessionId } = await askHermes(prompt, currentSessionId)
    currentSessionId = sessionId || currentSessionId
    // 初回送信時はボタンをセッションモードに切り替え
    const oob = hadSession ? '' : sessionButtonsOob()
    return c.html(`<pre>${escapeHtml(response)}</pre>${oob}`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[hermes/form] Error:', msg)
    return c.html(`<pre style="color:red">Error: ${escapeHtml(msg)}</pre>`)
  }
})

// ── 新規会話（セッションリセット）──
app.post('/hermes/new', async (c) => {
  currentSessionId = ''
  return c.html(`<p style="color:#64748b; font-size:0.9rem;">🆕 新しい会話を開始しました</p>${initialButtonsOob()}`)
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

// ── Hermes CLI 呼び出し（セッション対応）──
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
    throw new Error(`hermes exited ${exitCode}: ${stderr.trim() || stdout.trim()}`)
  }

  // session_id は stderr に出力される。stdout = 応答本文のみ
  let extractedSessionId = sessionId
  for (const line of stderr.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('session_id:')) {
      extractedSessionId = trimmed.replace(/^session_id:\s*/, '').trim()
    }
  }
  return { response: stdout.trim(), sessionId: extractedSessionId }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

serve({ port: PORT, fetch: app.fetch })
console.log(`[html-api] Running on http://localhost:${PORT}`)
