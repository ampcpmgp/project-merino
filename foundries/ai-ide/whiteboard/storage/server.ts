import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from 'bun'
import { mkdir, readFile, writeFile, readdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { createWriteStream } from 'fs'
import { pipeline } from 'node:stream/promises'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { validate as validateUUID } from 'uuid'
import archiver from 'archiver'

const PORT = process.env.PORT

const LOCAL_DIR = join(import.meta.dir, 'drawings')
const WORKSPACE_DIR = process.env.ENV === 'prod'
  ? '/workspace/whiteboard'
  // local のみで利用するバックアップ、形式上置いておく
  : join(import.meta.dir, '.local-backup')

await init()

const app = new Hono()

app.use(cors({
  origin: ['http://localhost:3101'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// UUID v4/v5 両方を許可（uuid パッケージの validate は全バージョン対応）
const uuidSchema = z.string().refine(
  (val) => validateUUID(val),
  { message: 'Invalid UUID format' }
)

const idParamSchema = z.object({ id: uuidSchema })

const validateId = zValidator('param', idParamSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: 'Invalid ID format: UUID required' }, 400)
  }
})

async function init() {
  await mkdir(LOCAL_DIR, { recursive: true })
  await mkdir(WORKSPACE_DIR, { recursive: true })
}

async function backupToWorkspace(id: string): Promise<void> {
  try {
    const validation = uuidSchema.safeParse(id)
    if (!validation.success) {
      throw new Error('Invalid UUID format')
    }

    const archivePath = join(WORKSPACE_DIR, `${id}.tar.gz`)
    const sourceDir = join(LOCAL_DIR, id)

    const output = createWriteStream(archivePath)
    const archive = archiver('tar', {
      gzip: true,
      gzipOptions: { level: 9 }
    })

    archive.directory(sourceDir, id)
    archive.finalize()

    await pipeline(archive, output)

    console.log(`[${new Date().toISOString()}] Compressed (${process.env.ENV === 'prod' ? 'workspace' : 'local'}): ${id}.tar.gz (${archive.pointer()} bytes)`)
  } catch (err) {
    console.error('Backup failed:', err)
    throw err
  }
}

app.post('/api/v1/:id', validateId, async (c) => {
  const { id } = c.req.valid('param')
  const data = await c.req.json()
  const timestamp = new Date().toISOString()

  const roomDir = join(LOCAL_DIR, id)
  await mkdir(roomDir, { recursive: true })

  await writeFile(
    join(roomDir, `${id}.json`),
    JSON.stringify({ ...data, savedAt: timestamp }, null, 2)
  )

  const historyDir = join(roomDir, 'history')
  await mkdir(historyDir, { recursive: true })
  await writeFile(
    join(historyDir, `${timestamp}.json`),
    JSON.stringify(data, null, 2)
  )

  const files = await readdir(historyDir)
  if (files.length > 30) {
    const sorted = files.sort()
    for (const f of sorted.slice(0, -30)) {
      await unlink(join(historyDir, f))
    }
  }

  await backupToWorkspace(id)

  console.log(`[${timestamp}] Saved: ${id} (${files.length} histories)`)
  return c.json({ success: true, id, timestamp })
})

app.get('/api/v1/:id', validateId, async (c) => {
  const { id } = c.req.valid('param')
  const timestamp = c.req.query('timestamp')

  const roomDir = join(LOCAL_DIR, id)
  const filePath = timestamp
    ? join(roomDir, 'history', `${timestamp}.json`)
    : join(roomDir, `${id}.json`)

  if (!existsSync(filePath)) {
    return c.json({ error: 'Not found' }, 404)
  }

  const content = await readFile(filePath, 'utf-8')
  return c.json(JSON.parse(content))
})

app.get('/api/v1/:id/history', validateId, async (c) => {
  const { id } = c.req.valid('param')
  const historyDir = join(LOCAL_DIR, id, 'history')

  if (!existsSync(historyDir)) {
    return c.json({ history: [] })
  }

  const files = await readdir(historyDir)
  const history = await Promise.all(
    files.map(async (f) => {
      const stats = await stat(join(historyDir, f))
      return {
        timestamp: f.replace('.json', ''),
        createdAt: stats.mtime.toISOString()
      }
    })
  )

  return c.json({
    history: history.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })
})

console.log(`Storage API starting on port ${PORT}...`)
console.log(`ENV: ${process.env.ENV || 'not set'}`)
console.log(`Local directory: ${LOCAL_DIR}`)
console.log(`Backup directory: ${WORKSPACE_DIR}`)
serve({ port: PORT, fetch: app.fetch })
console.log(`Storage API running on http://localhost:${PORT}`)
