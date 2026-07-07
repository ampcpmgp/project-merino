// サブプロセス実行 — 許可コマンドの allowlist 付き
import { spawn } from 'child_process'

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface ExecOptions {
  command: string
  args: string[]
  timeout?: number
}

// デフォルトで許可するコマンド
const DEFAULT_ALLOWED = [
  'bun', 'node', 'python3', 'bash', 'sh',
  'jq', 'curl', 'git', 'ffmpeg', 'grep',
  'ls', 'cat', 'head', 'tail', 'wc',
  'echo', 'printf', 'date', 'sort', 'uniq',
  'mkdir', 'cp', 'mv', 'rm',
]

// 許可コマンドリスト（環境変数で拡張可能）
const ALLOWED = process.env.HTMX_ALLOWED_COMMANDS
  ? process.env.HTMX_ALLOWED_COMMANDS.split(',')
  : DEFAULT_ALLOWED

export async function execCommand(opts: ExecOptions): Promise<ExecResult> {
  const cmd = opts.command

  // allowlist check
  if (!ALLOWED.includes(cmd)) {
    return { stdout: '', stderr: `Command not allowed: ${cmd}`, exitCode: 1 }
  }

  return new Promise((resolve) => {
    const proc = spawn(cmd, opts.args, {
      timeout: opts.timeout ?? 30_000,
      env: { ...process.env } as Record<string, string>,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 })
    })

    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, exitCode: 1 })
    })
  })
}
