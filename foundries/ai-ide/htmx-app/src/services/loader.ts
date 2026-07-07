// 動的スクリプトローダー — /workspace 上のユーザースクリプトを自動発見
import { readdirSync } from 'fs'
import { execCommand } from './executor'

export interface ToolDef {
  name: string
  type: 'builtin' | 'script'
  entry: string
  description: string
}

const SCRIPTS_DIR = process.env.HTMX_SCRIPTS_DIR || '/workspace/private/htmx-app/scripts'
const BUILT_IN_MANIFEST = './built-in/manifest.json'
const BUILT_IN_DIR = './built-in'

// Built-in tool の実装
const BUILTIN_HANDLERS: Record<string, () => Promise<string>> = {
  echo: async () => 'Usage: echo <text> — echoes back input',
  date: async () => `Current server time: ${new Date().toISOString()}`,
  files: async () => {
    const result = await execCommand({ command: 'ls', args: ['-la', '/workspace/private/documents/'] })
    return result.stdout || '(empty)'
  },
}

export async function discoverTools(): Promise<ToolDef[]> {
  const tools: ToolDef[] = []

  // 1. Built-in tools
  try {
    const manifest = await Bun.file(BUILT_IN_MANIFEST).json()
    for (const t of (manifest.tools || [])) {
      tools.push({ name: t.name, type: 'builtin', entry: t.entry, description: t.description })
    }
  } catch {
    // manifest がなければ built-in なし
  }

  // 2. User scripts from /workspace
  try {
    const dir = readdirSync(SCRIPTS_DIR)
    for (const file of dir) {
      if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.sh')) {
        const name = file.replace(/\.(ts|js|sh)$/, '')
        tools.push({
          name,
          type: 'script',
          entry: `${SCRIPTS_DIR}/${file}`,
          description: `User script: ${file}`,
        })
      }
    }
  } catch {
    // scripts dir がなければ user scripts なし
  }

  return tools
}

// 名前指定でツール/スクリプトを実行
export async function runTool(name: string, args: string[] = []): Promise<string> {
  const tools = await discoverTools()
  const tool = tools.find((t) => t.name === name)
  if (!tool) throw new Error(`Tool not found: ${name}`)

  if (tool.type === 'builtin') {
    // Built-in handler
    const handler = BUILTIN_HANDLERS[tool.name]
    if (handler) return await handler()
    return `Built-in tool: ${tool.name} (args: ${args.join(' ')})`
  }

  // Script execution
  if (tool.entry.endsWith('.ts') || tool.entry.endsWith('.js')) {
    const result = await execCommand({ command: 'bun', args: ['run', tool.entry, ...args] })
    return result.stderr ? `${result.stdout}\n--- stderr ---\n${result.stderr}` : result.stdout
  } else if (tool.entry.endsWith('.sh')) {
    const result = await execCommand({ command: 'bash', args: [tool.entry, ...args] })
    return result.stderr ? `${result.stdout}\n--- stderr ---\n${result.stderr}` : result.stdout
  }

  return `Unknown script type: ${tool.entry}`
}
