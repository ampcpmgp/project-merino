import { Hono } from 'hono'
import { serve } from 'bun'

const PORT = parseInt(process.env.HTMX_APP_PORT || '3200')

// Hermes の API 設定（config.yaml + .env から継承）
const API_KEY = process.env.OPENCODE_GO_API_KEY || ''
const BASE_URL = process.env.OPENCODE_GO_BASE_URL || 'https://opencode.ai/zen/go/v1'
const MODEL = 'deepseek-v4-flash'
const CHAT_URL = `${BASE_URL}/chat/completions`

const app = new Hono()

// ── Hermes API 呼び出し（OpenAI 互換）──
app.post('/hermes', async (c) => {
  const { prompt } = await c.req.json()
  if (!prompt) return c.text('Missing prompt', 400)
  const content = await askAI(prompt)
  return c.html(`<pre>${escapeHtml(content)}</pre>`)
})

app.post('/hermes/form', async (c) => {
  const body = await c.req.parseBody()
  const prompt = (body.prompt as string) || ''
  if (!prompt) return c.html('<p style="color:red">No prompt</p>')
  const content = await askAI(prompt)
  return c.html(`<pre>${escapeHtml(content)}</pre>`)
})

// ── カスタムスクリプト実行 ──
app.post('/exec/:name', async (c) => {
  const name = c.req.param('name')
  const dirs = ['/workspace/private/htmx-app/scripts', '/home/appuser/app/htmx-app/scripts-sample']
  let lastErr = ''
  for (const dir of dirs) {
    const scriptPath = `${dir}/${name}.ts`
    try {
      const mod = await import(scriptPath)
      const result = await mod.default(c)
      return c.html(typeof result === 'string' ? result : JSON.stringify(result))
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e.message : String(e)
    }
  }
  return c.html(`<pre style="color:red">Error: ${escapeHtml(lastErr)}</pre>`)
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

// ── ヘルスチェック ──
app.get('/health', (c) => c.json({
  status: 'ok', port: PORT,
  model: MODEL, api: CHAT_URL.replace(API_KEY, '***')
}))

// ── AI API 呼び出し関数（OpenAI 互換） ──
async function askAI(prompt: string): Promise<string> {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? '(empty response)'
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

serve({ port: PORT, fetch: app.fetch })
console.log(`[htmx-app] Running on http://localhost:${PORT}`)
console.log(`[htmx-app] Model: ${MODEL}, API: ${CHAT_URL.replace(API_KEY, '***')}`)
