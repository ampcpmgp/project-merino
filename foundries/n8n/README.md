# n8n with devenv

## Local Development with devenv

### CloudFlare Tunnel Setup

- [CloudFlare](https://www.cloudflare.com/ja-jp/) アカウントを作成し、[ドメインを登録](https://dash.cloudflare.com/3585af39fca4c51968b1a42a2e3da8eb/registrar/register)します。
- Zero Trust を作成し、 CloudFlare Tunnel をセットアップします。
- `foundries/n8n/.env.example` をコピーして `.env` を作成、上記で設定した値を N8N_URL, CLOUDFLARED_TOKEN に反映します。

### Runpod Storage Setup

- [Runpod Storage](https://console.runpod.io/user/storage) から S3 API Key を作成します
- 次に Network Volumne から S3 互換 Storage を作成します。
- 距離は近いところか、将来使いたい GPU インスタンスのリージョンを選択します。
- Storage Size は利用する容量に応じて設定します。最初は 10GB で十分です。

設定後、上記の値を以下 `.env` に設定します。

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_DEFAULT_REGION
- AWS_ENDPOINT_URL
- AWS_BUCKET_NAME

### Start n8n with devenv

以下を実行して、開発環境を起動します。

```bash
devenv up
```

### Backup workflow

TBA

### Cleanup

`devenv` 環境をクリーンアップするには、以下を実行します。

```bash
devenv clean
```
