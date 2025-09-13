# ai-ide

## Setup

### CloudFlare Tunnel Setup

- [CloudFlare](https://www.cloudflare.com/ja-jp/) アカウントを作成し、[ドメインを登録](https://dash.cloudflare.com/3585af39fca4c51968b1a42a2e3da8eb/registrar/register)します。
- Zero Trust を作成し、 CloudFlare Tunnel をセットアップします。
- `foundries/ai-ide/.env.example` をコピーして `.env` を作成、上記で設定した値を N8N_URL, CLOUDFLARED_TOKEN に反映します。
- 設定後、 Tunnels から 設定→パブリックホスト名→編集→接続 を開き、以下設定を行う
  - アイドル接続の有効期限 900
  - TCPキープアライブ間隔 15

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

## Docker

### build

```bash
cd foundries/ai-ide

docker build -t ofuton/ai-ide:$(cat VERSION) -t ofuton/ai-ide:latest .
```

### Start

```bash
docker run -it --rm --env-file .env --name ai-ide -v "/mnt/d/workspace/:/workspace" ofuton/ai-ide:latest
```

実行中に shell に入りたい場合は、以下コマンドを入力する

```bash
docker exec -it ai-ide /bin/bash
```
### Deploy

```bash
docker images
docker push --all-tags ofuton/ai-ide
```
