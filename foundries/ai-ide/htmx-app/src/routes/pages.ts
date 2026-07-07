// htmx ページ配信
import { Hono } from 'hono'
import { readFileSync } from 'fs'

export const pages = new Hono()

const INDEX_HTML = readFileSync('./public/index.html', 'utf-8')

// Home — splash page
pages.get('/', (c) => {
  return c.html(INDEX_HTML)
})

// Tools ページ（htmx フラグメント）
pages.get('/tools', (c) => {
  return c.html(`<div class="card" hx-get="/api/tools" hx-trigger="load" hx-swap="innerHTML"><p>Loading tools...</p></div>`)
})
