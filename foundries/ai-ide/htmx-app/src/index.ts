// htmx-app — Generic Hono server for ai-ide
// Docker ビルドに同梱する共通フレームワーク。
// カスタム処理は /workspace/private/htmx-app/scripts/ に配置して動的ロードする。

import { Hono } from 'hono'
import { serve } from 'bun'
import { serveStatic } from 'hono/bun'
import { logger } from './middleware/logger'
import { pages } from './routes/pages'
import { api } from './routes/api'
import { exec } from './routes/exec'
import { files } from './routes/files'

const PORT = parseInt(process.env.HTMX_APP_PORT || '3200')
const app = new Hono()

// ---- Middleware ----
app.use('*', logger)

// ---- Static files ----
app.use('/static/*', serveStatic({ root: './public' }))

// ---- Routes ----
app.route('/', pages)
app.route('/api', api)
app.route('/exec', exec)
app.route('/files', files)

// ---- Health check ----
app.get('/health', (c) => c.json({ status: 'ok', port: PORT }))

// ---- Start ----
console.log(`[htmx-app] Starting on port ${PORT}...`)
serve({ port: PORT, fetch: app.fetch })
console.log(`[htmx-app] Running on http://localhost:${PORT}`)
