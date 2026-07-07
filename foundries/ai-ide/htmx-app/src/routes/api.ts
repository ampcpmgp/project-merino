// API エンドポイント — ツール一覧・動的ローダー
import { Hono } from 'hono'
import { discoverTools } from '../services/loader'

export const api = new Hono()

// 利用可能なツール/スクリプト一覧を HTML フラグメントとして返す
api.get('/tools', async (c) => {
  const tools = await discoverTools()
  if (tools.length === 0) {
    return c.html('<p>No tools available.</p>')
  }

  const items = tools.map((t) => {
    const badge = t.type === 'builtin'
      ? '<span class="badge badge-builtin">built-in</span>'
      : '<span class="badge badge-script">script</span>'
    return `
      <div class="tool-card" hx-post="/exec/run" hx-vals='{"script":"${t.name}","args":""}' hx-target="#exec-result" hx-indicator="#loading">
        <h3>${t.name} ${badge}</h3>
        <p>${t.description}</p>
      </div>
    `
  })

  return c.html(items.join(''))
})

// スクリプト選択肢を <option> として返す
api.get('/scripts-options', async (c) => {
  const tools = await discoverTools()
  const opts = tools.map((t) => `<option value="${t.name}">${t.name} (${t.type})</option>`)
  return c.html(opts.join('\n'))
})
