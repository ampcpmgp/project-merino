import { Hono } from 'hono'
import { serve } from 'bun'
import { mkdirSync, existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { jsonrepair } from 'jsonrepair'

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

// ── Hermes JSON SSE（stream + system prompt）──
app.post('/api/hermes/chat/stream-json', async (c) => {
  try {
    const { message, session_id, output } = await c.req.json()
    if (!message) return c.json({ ok: false, error: 'No message' }, 400)
    if (!output) return c.json({ ok: false, error: 'output required: "simple" or "complex"' }, 400)

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

    // 2. system prompt（JSONファイル生成）
    const ts = Date.now()
    const safeId = sid.replace(/[^a-zA-Z0-9_-]/g, '_')
    const outPath = join(PIPELINE_DIR, `${safeId}_${ts}.json`)
    const outFile = `/tmp/pipeline/${safeId}_${ts}.json`

    const system = `保存先: ${outFile}

絶対に質問してはいけません。上記のパスに write_file で保存してください。
有効なJSONデータのみを出力してください。JSON.parse()でパースできる完全なJSONである必要があります。
終わったら「保存完了」とだけ言ってください。
出力型: ${output}`

    // 3. AbortController 準備
    const streamId = `s-${sid}`
    const abortCtl = new AbortController()
    activeStreams.set(streamId, abortCtl)

    // 4. Hermes API に接続（stream + system）
    const apiRes = await fetch(`${HERMES_API}/api/sessions/${sid}/chat/stream`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ message, system }),
      signal: abortCtl.signal,
    })
    if (!apiRes.ok || !apiRes.body) {
      activeStreams.delete(streamId)
      const err = apiRes.status ? await apiRes.text().catch(() => '') : 'connection failed'
      return c.json({ ok: false, error: `API error (${apiRes.status})` }, 502)
    }

    // 5. SSE をパイプ＋終了後に outFile を確認/フォールバック保存
    const enc = new TextEncoder()
    const e = (s: string) => enc.encode(s)
    let completedContent = ''
    const stream = new ReadableStream({
      start(controller) {
        const reader = apiRes.body!.getReader()
        let buf = ''

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              // ストリーム終了 → outFile 確認（Agentがwrite_fileしたか）
              if (!existsSync(outPath) && completedContent) {
                // フォールバック1: APIがassistant.completed内容を保存
                try { Bun.write(outPath, completedContent) } catch {}
              }
              if (!existsSync(outPath)) {
                // フォールバック2: 最近作成されたJSONファイルをスキャン
                for (const dir of ['/home/appuser', '/workspace', PIPELINE_DIR]) {
                  try {
                    const files = readdirSync(dir).filter(f => f.endsWith('.json'))
                    files.sort((a, b) => statSync(`${dir}/${b}`).mtimeMs - statSync(`${dir}/${a}`).mtimeMs)
                    const recent = files[0]
                    if (recent && Date.now() - statSync(`${dir}/${recent}`).mtimeMs < 15000) {
                      const content = readFileSync(`${dir}/${recent}`, 'utf-8')
                      Bun.write(outPath, content)
                      break
                    }
                  } catch {}
                }
              }
              const ok = existsSync(outPath)
              let content: string | null = null
              let isJson = false
              if (ok) {
                try {
                  content = readFileSync(outPath, 'utf-8')
                  isJson = false
                  if (content) {
                    const t = content.trim()
                    if (t.startsWith('{') || t.startsWith('[')) {
                      try { JSON.parse(t); isJson = true } catch {
                        try { jsonrepair(t); isJson = true } catch {}
                      }
                    }
                  }
                } catch {}
              }
              controller.enqueue(e(`event: result\ndata: ${JSON.stringify({
                ok,
                file_url: ok ? outFile : null,
                content,
                is_json: isJson,
                session_id: sid,
                output,
                error: ok ? undefined : 'File not found',
              })}\n\n`))
              controller.close()
              return
            }

            // SSEをパースしてcompletedを捕捉（フォールバック用）
            buf += new TextDecoder().decode(value, { stream: true })
            const parts = buf.split('\n\n')
            buf = parts.pop() || ''
            for (const part of parts) {
              const lines = part.split('\n')
              let ev = '', data = ''
              for (const l of lines) {
                if (l.startsWith('event: ')) ev = l.slice(7).trim()
                else if (l.startsWith('data: ')) data = l.slice(6)
              }
              if (ev === 'assistant.completed' && data) {
                try {
                  let raw = JSON.parse(data).content || ''
                  // コードブロック抽出 → JSONパース試行 → jsonrepair
                  const cb = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
                  const candidate = (cb ? cb[1] : raw).trim()
                  if (candidate) {
                    try { JSON.parse(candidate); raw = candidate }
                    catch {
                      try { const r = jsonrepair(candidate); if (r) raw = r } catch {}
                    }
                  }
                  completedContent = raw
                } catch {}
              }
              controller.enqueue(e(part + '\n\n'))
            }
            return pump()
          }).catch((err) => {
            if (err.name === 'AbortError') { controller.close(); return }
            controller.close()
          })
        }
        pump().finally(() => activeStreams.delete(streamId))
      },
      cancel() { abortCtl.abort(); activeStreams.delete(streamId) },
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
