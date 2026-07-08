// /workspace/private/html-api/scripts/hello.ts
// サンプルユーザースクリプト — 動的ロードの動作確認用

export default async function (c: any) {
  const now = new Date().toISOString()
  const dir = '/workspace/private/html-api/scripts'
  // Bun.Glob でスクリプト一覧を取得（非同期イテレータ）
  const glob = new Bun.Glob('*.ts')
  const files: string[] = []
  for await (const file of glob.scan({ cwd: dir })) {
    files.push(file)
  }
  return `
<p>👋 Hello from <code>${dir}/hello.ts</code></p>
<ul>
  <li>Server time: ${now}</li>
  <li>Detected scripts: ${files.join(', ') || '(none)'}</li>
  <li>Script loaded dynamically — no server restart needed</li>
</ul>`
}
