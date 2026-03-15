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

## 短縮URL機能

nginx の Lua モジュールを使って、nginx の再起動なしに短縮URLをダイナミックに管理できます。

短縮URLは `/s/<キー>` のパスでアクセスでき、`/workspace/url-shortcuts/<キー>` ファイルに記載されたURLへリダイレクトされます。

### 管理スクリプト

コンテナ内で以下のスクリプトを使用します。

```bash
/home/appuser/app/scripts-user/url-shortener.sh <コマンド> [引数]
```

**短縮URLを追加または更新する:**

```bash
/home/appuser/app/scripts-user/url-shortener.sh add gh https://github.com
# ✅ 短縮URLを登録しました: /s/gh -> https://github.com
```

**短縮URLの一覧を表示する:**

```bash
/home/appuser/app/scripts-user/url-shortener.sh list
# 📋 短縮URLの一覧:
#   /s/gh -> https://github.com
```

**短縮URLを削除する:**

```bash
/home/appuser/app/scripts-user/url-shortener.sh remove gh
# ✅ 短縮URLを削除しました: /s/gh
```

### 設定ファイル

`/workspace/url-shortcuts/` ディレクトリ配下に、キー名のファイルを作成しURLを書き込むことでも直接管理できます。nginx の再起動は不要です。

```bash
# 例: /s/gh -> https://github.com を直接作成
echo "https://github.com" > /workspace/url-shortcuts/gh
```

## Docker

### build

```bash
cd foundries/ai-ide

docker build -t ofuton/ai-ide:$(cat VERSION) -t ofuton/ai-ide:latest .
```

### Start

E ドライブ等に `/workspace/public` フォルダを作成します。このパスは公開ディレクトリになります。

WSL に自動認識されない場合、以下コマンドでマウントします。

```bash
sudo mkdir /mnt/e
sudo mount -t drvfs E: /mnt/e
```

```bash
cd foundries/ai-ide
docker run -it --rm --env-file .env --name ai-ide -v "/mnt/e/workspace/:/workspace" ofuton/ai-ide:latest
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
