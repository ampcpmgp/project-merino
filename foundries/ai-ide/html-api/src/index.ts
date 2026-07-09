import { Hono } from 'hono'
import { serve } from 'bun'

const PORT = 3200

// Hermes API Server (同一コンテナ内 localhost:8642)
// AIキーは Docker .env の HERMES_API_KEY から継承される
const HERMES_API = 'http://127.0.0.1:8642'
const HERMES_API_KEY = process.env.HERMES_API_KEY
if (!HERMES_API_KEY) {
  console.error('[FATAL] HERMES_API_KEY is not set. Add it to Docker .env or supervisor environment.')
  process.exit(1)
}
const AUTH_HEADERS = {
  'Authorization': `Bearer ${HERMES_API_KEY}`,
  'Content-Type': 'application/json',
}

const app = new Hono()

// ── アクティブなストリーム管理（キャンセル用） ──
const activeStreams = new Map<string, AbortController>()

// ═══════════════════════════════════════════
// JSON API — `/api/` 配下はすべて JSON 応答
// ═══════════════════════════════════════════

// ── Hermes チャット（Sessions API /chat/stream SSE）──
app.post('/api/hermes/chat/stream', async (c) => {
  try {
    const { message, session_id } = await c.req.json()
    if (!message) return c.json({ ok: false, error: 'No message' }, 400)

    // 1. セッション作成（なければ）
    let sid = session_id
    if (!sid) {
      const sessRes = await fetch(`${HERMES_API}/api/sessions`, {
        method: 'POST', headers: AUTH_HEADERS, body: '{}',
      })
      if (!sessRes.ok) {
        return c.json({ ok: false, error: `Session creation failed (${sessRes.status})` }, 502)
      }
      const sess = await sessRes.json()
      sid = sess.session?.id
      if (!sid) return c.json({ ok: false, error: 'No session_id in response' }, 502)
    }

    // 2. AbortController 準備
    const streamId = `s-${sid}`
    const abortCtl = new AbortController()
    activeStreams.set(streamId, abortCtl)

    // 3. Sessions API SSE に接続
    const apiRes = await fetch(`${HERMES_API}/api/sessions/${sid}/chat/stream`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ message }),
      signal: abortCtl.signal,
    })
    if (!apiRes.ok || !apiRes.body) {
      activeStreams.delete(streamId)
      const err = apiRes.status ? await apiRes.text().catch(() => '') : 'connection failed'
      console.error('[stream] Sessions API error:', apiRes.status, err)
      return c.json({ ok: false, error: `Sessions API error (${apiRes.status})` }, 502)
    }

    // 4. SSE をそのままクライアントにパイプ
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const reader = apiRes.body!.getReader()
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) { controller.close(); return }
            controller.enqueue(value)
            return pump()
          }).catch((err) => {
            if (err.name === 'AbortError') { controller.close(); return }
            console.error('[stream] pipe error:', err)
            controller.close()
          })
        }
        pump().finally(() => activeStreams.delete(streamId))
      },
      cancel() {
        abortCtl.abort()
        activeStreams.delete(streamId)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[api/hermes/chat/stream] Error:', msg)
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ── ストリームをキャンセル（POST /v1/runs/{run_id}/stop） ──
app.post('/api/hermes/chat/stop', async (c) => {
  try {
    const { run_id } = await c.req.json()
    if (!run_id) return c.json({ ok: false, error: 'No run_id' }, 400)

    // ローカルの AbortController で fetch 中断
    // （run_id から streamId を逆引きできないので全探索）
    for (const [id, ctl] of activeStreams) {
      if (id.endsWith(run_id) || id === run_id) { ctl.abort(); activeStreams.delete(id); break }
    }

    // Hermes API Server にキャンセル通知
    const res = await fetch(`${HERMES_API}/v1/runs/${run_id}/stop`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${HERMES_API_KEY}` },
    })
    if (!res.ok && res.status !== 404) {
      return c.json({ ok: false, error: `Stop failed (${res.status})` }, 502)
    }
    return c.json({ ok: true, run_id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ── 書式なし同期チャット（互換性維持） ──
app.post('/api/hermes/chat/new', async (c) => {
  try {
    const { prompt, session_id } = await c.req.json()
    if (!prompt) return c.json({ ok: false, error: 'No prompt' })

    // セッション作成 or 継続
    let sid = session_id
    if (!sid) {
      const sessRes = await fetch(`${HERMES_API}/api/sessions`, {
        method: 'POST', headers: AUTH_HEADERS, body: '{}',
      })
      if (!sessRes.ok) return c.json({ ok: false, error: 'Session creation failed' }, 502)
      const sess = await sessRes.json()
      sid = sess.session?.id
    }

    const res = await fetch(`${HERMES_API}/api/sessions/${sid}/chat`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ message: prompt }),
    })
    if (!res.ok) {
      const err = await res.text()
      return c.json({ ok: false, error: `API ${res.status}: ${err.slice(0, 200)}` }, 502)
    }
    const data = await res.json()
    return c.json({
      ok: true,
      response: data.message?.content || '(empty)',
      session_id: sid,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg })
  }
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
      const output = typeof result === 'string' ? result : JSON.stringify(result)
      return c.json({ ok: true, output: `<pre>${output}</pre>` })
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

// ── CORS ──
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  await next()
})

serve({ port: PORT, fetch: app.fetch })
console.log(`[html-api] Running on http://localhost:${PORT}`)
console.log(`[html-api] Hermes API: ${HERMES_API}`)
console.log(`[html-api] Session + SSE: ✅ /api/hermes/chat/stream (送信 body: { message, session_id? })`)
console.log(`[html-api] Cancel (run_id): ✅ /api/hermes/chat/stop (送信 body: { run_id })`)
