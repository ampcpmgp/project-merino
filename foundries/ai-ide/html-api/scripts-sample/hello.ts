// /workspace/private/html-api/scripts/hello.ts
// サンプルユーザースクリプト — 動的ロードの動作確認用（JSON API 対応）

export default async function (c: any) {
  const now = new Date().toISOString()
  const dir = '/workspace/private/html-api/scripts'
  // Bun.Glob でスクリプト一覧を取得（非同期イテレータ）
  const glob = new Bun.Glob('*.ts')
  const files: string[] = []
  for await (const file of glob.scan({ cwd: dir })) {
    files.push(file)
  }
  return JSON.stringify({
    message: '👋 Hello from hello.ts',
    serverTime: now,
    detectedScripts: files,
    dir,
  })
}
