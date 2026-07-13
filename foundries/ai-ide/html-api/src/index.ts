import { Hono } from 'hono'
import { serve } from 'bun'
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'

const PORT = 3200

// Hermes API Server (同一コンテナ内 localhost:8642)
const HERMES_API = 'http://127.0.0.1:8642'
const HERMES_API_KEY = process.env.HERMES_API_KEY
if (!HERMES_API_KEY) {
  console.error('[FATAL] HERMES_API_KEY is not set.')
  process.exit(1)
}
const AUTH_HEADERS = {
  'Authorization': `Bearer ${HERMES_API_KEY}`,
  'Content-Type': 'application/json',
}

const app = new Hono()

// ── Paths ──
const WORKFLOWS_DIR = '/workspace/private/html-app/ai-workflows/workflows'
const AI_WORKFLOWS_DIR = '/workspace/private/html-app/ai-workflows'

// ── ID サニタイズ（パストラバーサル防止）──
function sanitizeId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '')
  if (!safe) throw new Error('Invalid workflow ID')
  return safe
}

// ── Pipeline 出力ディレクトリ ──
const PIPELINE_DIR = '/tmp/pipeline'
mkdirSync(PIPELINE_DIR, { recursive: true })

// ── アクティブなストリーム管理（run_id → AbortController）──
const activeRuns = new Map<string, AbortController>()

// ═══════════════════════════════════════════
// Workflows API
// ═══════════════════════════════════════════

// ── 全ワークフロー一覧 ──
app.get('/api/workflows', async (c) => {
  try {
    mkdirSync(WORKFLOWS_DIR, { recursive: true })
    const entries = readdirSync(WORKFLOWS_DIR, { withFileTypes: true })
    const workflows: any[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const wfPath = join(WORKFLOWS_DIR, entry.name, 'workflow.json')
      if (!existsSync(wfPath)) continue
      try {
        const raw = readFileSync(wfPath, 'utf-8')
        const wf = JSON.parse(raw)
        workflows.push({
          id: entry.name,
          name: wf.name || entry.name,
          description: wf.description || '',
          status: wf.status || 'unknown',
          cells_count: (wf.cells || []).length,
          updated_at: wf.updated_at || null,
          created_at: wf.created_at || null,
        })
      } catch { /* skip invalid */ }
    }
    // sort by created_at desc, then name
    workflows.sort((a, b) => {
      if (a.created_at && b.created_at) return b.created_at.localeCompare(a.created_at)
      return a.name.localeCompare(b.name)
    })
    return c.json({ ok: true, workflows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ── ワークフロー作成 ──
app.post('/api/workflows', async (c) => {
  try {
    const { name, description, cells } = await c.req.json()
    if (!name) return c.json({ ok: false, error: 'No name' }, 400)

    // ID生成: 日付＋名前の英数字部分
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const safeName = name.replace(/[^a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '_').slice(0, 30)
    let id = `workflow-${ts}_${safeName}`
    let dir = join(WORKFLOWS_DIR, id)
    let counter = 1
    while (existsSync(dir)) {
      id = `workflow-${ts}_${safeName}_${counter}`
      dir = join(WORKFLOWS_DIR, id)
      counter++
    }

    mkdirSync(dir, { recursive: true })

    const now = new Date().toISOString()
    const wf = {
      id,
      name,
      description: description || '',
      created_at: now,
      updated_at: now,
      cells: cells || [],
      status: 'idle' as const,
    }

    writeFileSync(join(dir, 'workflow.json'), JSON.stringify(wf, null, 2))

    // last-session.json も作成
    writeFileSync(join(dir, 'last-session.json'), JSON.stringify({
      hermes_session_id: null,
      last_cell_index: null,
      status: 'idle',
      results: {},
    }, null, 2))

    return c.json({ ok: true, workflow: wf })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ── 1件取得 ──
app.get('/api/workflows/:id', async (c) => {
  try {
    const rawId = c.req.param('id')
    const id = sanitizeId(rawId)
    const wfPath = join(WORKFLOWS_DIR, id, 'workflow.json')
    if (!existsSync(wfPath)) return c.json({ ok: false, error: 'Not found' }, 404)
    const raw = readFileSync(wfPath, 'utf-8')
    const wf = JSON.parse(raw)
    return c.json({ ok: true, workflow: wf })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ── 更新 ──
app.put('/api/workflows/:id', async (c) => {
  try {
    const rawId = c.req.param('id')
    const id = sanitizeId(rawId)
    const wfPath = join(WORKFLOWS_DIR, id, 'workflow.json')
    if (!existsSync(wfPath)) return c.json({ ok: false, error: 'Not found' }, 404)

    const updates = await c.req.json()
    const raw = readFileSync(wfPath, 'utf-8')
    const wf = JSON.parse(raw)

    // 許可する更新フィールド
    if (updates.name !== undefined) wf.name = updates.name
    if (updates.description !== undefined) wf.description = updates.description
    if (updates.cells !== undefined) wf.cells = updates.cells
    if (updates.status !== undefined) wf.status = updates.status
    wf.updated_at = new Date().toISOString()

    writeFileSync(wfPath, JSON.stringify(wf, null, 2))
    return c.json({ ok: true, workflow: wf })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ── 削除 ──
app.delete('/api/workflows/:id', async (c) => {
  try {
    const rawId = c.req.param('id')
    const id = sanitizeId(rawId)
    const dir = join(WORKFLOWS_DIR, id)
    if (!existsSync(dir)) return c.json({ ok: false, error: 'Not found' }, 404)
    rmSync(dir, { recursive: true, force: true })
    return c.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ── セッション情報の読み書き ──
app.get('/api/workflows/:id/session', async (c) => {
  try {
    const rawId = c.req.param('id')
    const id = sanitizeId(rawId)
    const sessPath = join(WORKFLOWS_DIR, id, 'last-session.json')
    if (!existsSync(sessPath)) {
      return c.json({ ok: true, session: { hermes_session_id: null, last_cell_index: null, status: 'idle', results: {} } })
    }
    const raw = readFileSync(sessPath, 'utf-8')
    return c.json({ ok: true, session: JSON.parse(raw) })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
  }
})

app.put('/api/workflows/:id/session', async (c) => {
  try {
    const rawId = c.req.param('id')
    const id = sanitizeId(rawId)
    const dir = join(WORKFLOWS_DIR, id)
    mkdirSync(dir, { recursive: true })
    const sessPath = join(dir, 'last-session.json')
    const updates = await c.req.json()
    const existing = existsSync(sessPath) ? JSON.parse(readFileSync(sessPath, 'utf-8')) : {}
    const merged = { ...existing, ...updates }
    writeFileSync(sessPath, JSON.stringify(merged, null, 2))
    return c.json({ ok: true, session: merged })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ═══════════════════════════════════════════
// Hermes Chat APIs
// ═══════════════════════════════════════════

// ── Hermes チャット（Sessions API /chat/stream SSE）──
app.post('/api/hermes/chat/stream', async (c) => {
  try {
    const { message, session_id } = await c.req.json()
    if (!message) return c.json({ ok: false, error: 'No message' }, 400)

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

    const abortCtl = new AbortController()

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

    let runIdBuf = ''
    const stream = new ReadableStream({
      start(controller) {
        const reader = apiRes.body!.getReader()
        const decoder = new TextDecoder()

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) { controller.close(); return }
            if (!(abortCtl as any).runId) {
              runIdBuf += decoder.decode(value, { stream: true })
              const m = runIdBuf.match(/"run_id"\s*:\s*"([^"]+)"/)
              if (m?.[1]) {
                (abortCtl as any).runId = m[1]
                activeRuns.set(m[1], abortCtl)
              }
            }
            controller.enqueue(value)
            return pump()
          }).catch((err) => {
            if (err.name === 'AbortError') return
            console.error('[stream] pipe error:', err)
            try { controller.close() } catch {}
          })
        }
        pump().finally(() => {
          const rid = (abortCtl as any).runId
          if (rid) activeRuns.delete(rid)
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

    const ctl = activeRuns.get(run_id)
    if (ctl) {
      ctl.abort()
      activeRuns.delete(run_id)
    }

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

    const ts = Date.now()
    const safeId = sid.replace(/[^a-zA-Z0-9_-]/g, '_')
    const outPath = join(PIPELINE_DIR, `${safeId}_${ts}.json`)

    const structBlock = `\n期待されるJSON構造:\n\`\`\`json\n${structure}\n\`\`\``
    const system = `## 指示\n\n有効なJSONデータを ${outPath} に出力しなさい。出力する際、 jsonrepair を利用しなさい。\n質問禁止。出力後はファイルが正しく書き込まれたか検証すること。${structBlock}\n\n## 出力型:\n\n\`\`\`json\n${output}\n\`\`\``.trim()

    const abortCtl = new AbortController()

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

    let runIdBuf = ''
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
            if (!(abortCtl as any).runId) {
              runIdBuf += decoder.decode(value, { stream: true })
              const m = runIdBuf.match(/"run_id"\s*:\s*"([^"]+)"/)
              if (m?.[1]) {
                (abortCtl as any).runId = m[1]
                activeRuns.set(m[1], abortCtl)
              }
            }
            controller.enqueue(value)
            return pump()
          }).catch((err) => {
            if (err.name === 'AbortError') return
            console.error('[stream-json] pipe error:', err)
            try { controller.close() } catch {}
          })
        }
        pump().finally(() => {
          const rid = (abortCtl as any).runId
          if (rid) activeRuns.delete(rid)
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

// ── SSE Error テスト ──
app.get('/api/test/sse-error', async (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const msg = JSON.stringify({ delta: 'triggering error...', session_id: 'test', run_id: 'test_run' })
      controller.enqueue(enc.encode(`event: assistant.delta\ndata: ${msg}\n\n`))
      setTimeout(() => {
        const err = JSON.stringify({ error: 'Test error', step: 'test', session_id: 'test', run_id: 'test_run' })
        controller.enqueue(enc.encode(`event: error\ndata: ${err}\n\n`))
        controller.close()
      }, 100)
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
  })
})

// ── CORS ──
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
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
console.log(`[html-api] ✅ GET/POST /api/workflows            (CRUD)`)
console.log(`[html-api] ✅ GET/PUT/DELETE /api/workflows/:id  (CRUD)`)
console.log(`[html-api] ✅ GET/PUT /api/workflows/:id/session (session state)`)
