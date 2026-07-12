import { Hono } from 'hono'
import { serve } from 'bun'
import { mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

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

// ── Pipeline 出力ディレクトリ ──
const PIPELINE_DIR = '/tmp/pipeline'
mkdirSync(PIPELINE_DIR, { recursive: true })

// ── アクティブなストリーム管理（run_id → AbortController）
// cancel() からは abort せず、stop ハンドラからの exact match のみで abort する。
const activeRuns = new Map<string, AbortController>()

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
    const abortCtl = new AbortController()

    // 3. Sessions API SSE に接続
    const apiRes = await fetch(`${HERMES_API}/api/sessions/${sid}/chat/stream`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ message }),
      signal: abortCtl.signal,
    })
    if (!apiRes.ok || !apiRes.body) {
      const err = apiRes.status ? await apiRes.text().catch(() => '') : 'connection failed'
      console.error('[stream] Sessions API error:', apiRes.status, err)
      return c.json({ ok: false, error: `Sessions API error (${apiRes.status})` }, 502)
    }

    // 4. SSE をそのままクライアントにパイプ
    // pump() 内で run_id を抽出して activeRuns に登録する
    let runIdRegistered = false
    const stream = new ReadableStream({
      start(controller) {
        const reader = apiRes.body!.getReader()
        const decoder = new TextDecoder()

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) { controller.close(); return }
            // run_id を抽出（Hermes API の SSE イベントに含まれる）
            if (!runIdRegistered) {
              const text = decoder.decode(value, { stream: true })
              const m = text.match(/"run_id"\s*:\s*"([^"]+)"/)
              if (m?.[1]) {
                activeRuns.set(m[1], abortCtl)
                runIdRegistered = true
              }
            }
            controller.enqueue(value)
            return pump()
          }).catch((err) => {
            console.error('[stream] pipe error:', err)
            try { controller.close() } catch {}
          })
        }
        pump().finally(() => {
          // cleanup: run_id が登録されていれば削除
          for (const [rid, ctl] of activeRuns) {
            if (ctl === abortCtl) { activeRuns.delete(rid); break }
          }
        })
      },
      cancel() {
        // abort しない — stop ハンドラからの exact match のみ
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

// ── ストリームをキャンセル ──
app.post('/api/hermes/chat/stop', async (c) => {
  try {
    const { run_id } = await c.req.json()
    if (!run_id) return c.json({ ok: false, error: 'No run_id' }, 400)

    // 1. ローカルの AbortController を exact match で探して abort
    //    （cancel() は abort しないため、ここが唯一の local abort 経路）
    const ctl = activeRuns.get(run_id)
    if (ctl) {
      ctl.abort()
      activeRuns.delete(run_id)
    }

    // 2. Hermes API Server にもキャンセル通知（Sessions API の run は
    //    _active_run_agents に未登録のため 404 が返るが、念のため送る）
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

// ── Hermes JSON SSE ──
app.post('/api/hermes/chat/stream-json', async (c) => {
  try {
    const { message, session_id, output, structure } = await c.req.json()
    if (!message) return c.json({ ok: false, error: 'No message' }, 400)
    if (!output) return c.json({ ok: false, error: 'No output type' }, 400)
    if (!structure) return c.json({ ok: false, error: 'No structure' }, 400)

    // 1. セッション作成
    let sid = session_id
    if (!sid) {
      const sessRes = await fetch(`${HERMES_API}/api/sessions`, {
        method: 'POST', headers: AUTH_HEADERS, body: '{}',
      })
      if (!sessRes.ok) return c.json({ ok: false, error: 'Session creation failed' }, 502)
      const sess = await sessRes.json()
      sid = sess.session?.id
      if (!sid) return c.json({ ok: false, error: 'No session_id' }, 502)
    }

    // 2. outFile 生成
    const ts = Date.now()
    const safeId = sid.replace(/[^a-zA-Z0-9_-]/g, '_')
    const outPath = join(PIPELINE_DIR, `${safeId}_${ts}.json`)

    // 3. system prompt（message に結合）
    const structBlock = `\n期待されるJSON構造:\n\`\`\`json\n${structure}\n\`\`\``
    const system = `## 指示

有効なJSONデータを ${outPath} に出力しなさい。出力する際、 jsonrepair を利用しなさい。
質問禁止。出力後はファイルが正しく書き込まれたか検証すること。${structBlock}

## 出力型:

\`\`\`json
${output}
\`\`\``.trim()

    // 4. AbortController 準備
    const abortCtl = new AbortController()

    // 5. Hermes API に接続（system は message に結合）
    const fullMessage = `${system}\n\n${message}`
    const apiRes = await fetch(`${HERMES_API}/api/sessions/${sid}/chat/stream`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ message: fullMessage }),
      signal: abortCtl.signal,
    })
    if (!apiRes.ok || !apiRes.body) {
      const err = apiRes.status ? await apiRes.text().catch(() => '') : 'connection failed'
      return c.json({ ok: false, error: `API error (${apiRes.status})` }, 502)
    }

    // 6. SSE パイプ、終了後 outFile 確認
    // pump() 内で run_id を抽出して activeRuns に登録する
    let runIdRegistered = false
    const enc = new TextEncoder()
    const e = (s: string) => enc.encode(s)
    const stream = new ReadableStream({
      start(controller) {
        const reader = apiRes.body!.getReader()
        const decoder = new TextDecoder()

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              let content: string | null = null
              let error: string | undefined
              if (existsSync(outPath)) {
                try { content = readFileSync(outPath, 'utf-8') } catch {}
              }
              if (!content) error = 'File not found'
              controller.enqueue(e(`event: result\ndata: ${JSON.stringify({
                ok: !!content,
                file_url: content ? outPath : null,
                content,
                error,
                session_id: sid,
                output,
              })}\n\n`))
              controller.close()
              return
            }
            // run_id を抽出
            if (!runIdRegistered) {
              const text = decoder.decode(value, { stream: true })
              const m = text.match(/"run_id"\s*:\s*"([^"]+)"/)
              if (m?.[1]) {
                activeRuns.set(m[1], abortCtl)
                runIdRegistered = true
              }
            }
            controller.enqueue(value)
            return pump()
          }).catch((err) => {
            console.error('[stream-json] pipe error:', err)
            try { controller.close() } catch {}
          })
        }
        pump().finally(() => {
          for (const [rid, ctl] of activeRuns) {
            if (ctl === abortCtl) { activeRuns.delete(rid); break }
          }
        })
      },
      cancel() {
        // abort しない — stop ハンドラからの exact match のみ
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
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
console.log(`[html-api] ✅ POST /api/hermes/chat/stream       (text SSE)`)
console.log(`[html-api] ✅ POST /api/hermes/chat/stream-json  (JSON SSE, output 必須)`)
console.log(`[html-api] ✅ POST /api/hermes/chat/stop         (cancel, body: { run_id })`)
