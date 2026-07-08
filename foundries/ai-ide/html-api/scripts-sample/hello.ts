// サンプルユーザースクリプト
// /workspace/private/htmx-app/scripts/ に配置すると自動認識される

export default async function (c: any) {
  return `<p>👋 Hello from a user script in /workspace!</p>
<p>Server time: ${new Date().toISOString()}</p>
<p>Script location: /workspace/private/htmx-app/scripts/hello.ts</p>`
}
