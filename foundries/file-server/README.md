## Dockerfile版 ファイルサーバー

このリポジトリは、`code-server`（管理者用）と `nginx`（公開用）を単一のDockerイメージにまとめ、`docker run`コマンドで起動できるようにしたものです。`docker-compose` が利用できない環境（例: Runpod）での使用を想定しています。

### 構成

- **`code-server`**: 管理者用のファイルアップロード・ダウンロード環境です。
  - ポート `8080` で動作します。
  - `/workspace` ディレクトリ全体にアクセスできます。
- **`nginx`**: 誰でも閲覧可能な公開用ファイルサーバーです。
  - ポート `80` で動作します。
  - `/workspace/public` ディレクトリの中身を公開します。
- **`supervisor`**: `code-server`と`nginx`の2つのプロセスをコンテナ内で同時に起動・管理します。

### 使い方

#### 1. `.env` ファイルの作成

まず、`code-server`のログインパスワードを設定するため、`.env`ファイルを作成します。 `.env.example` をコピーして作成してください。

```
cd foundries
cp .env.example .env
```

次に、`.env`ファイルを開き、パスワードを好きなものに変更します。

```
# .env
PASSWORD=your_strong_password_here
```

#### 2. Dockerイメージのビルド

`Dockerfile` があるディレクトリ（`file-server/`）で、以下のコマンドを実行してDockerイメージをビルドします。`file-server` の部分は好きなイメージ名に変更できます。

```
docker build -t ofuton/file-server:$(cat VERSION) -t ofuton/file-server:latest .
```

#### 3. コンテナの起動

ビルドしたイメージを使ってコンテナを起動します。`--env-file` オプションで先ほど作成した`.env`ファイルを読み込ませます。

```
docker run --rm \
  --env-file ./.env \
  -p 80:80 \
  -p 8080:8080 \
  -v "/mnt/d/workspace/:/workspace" \
  --name file-server \
  ofuton/file-server:$(cat VERSION)
```

- `--rm`: コンテナが停止したときに自動的に削除します。
- `--env-file ./.env`: `.env`ファイルから環境変数（`PASSWORD`）を読み込みます。
- `-p 80:80`: ホストのポート`80`をコンテナの`nginx`ポート`80`に接続します。
- `-p 8080:8080`: ホストのポート`8080`をコンテナの`code-server`ポート`8080`に接続します。
- `-v "/mnt/d/workspace/:/workspace"`: ホストの`/mnt/d/workspace/`フォルダをコンテナの`/workspace`にマウントします。これにより、コンテナを停止・削除してもファイルが永続化されます。**このコマンドを実行する前に、ホスト側に`workspace/public`ディレクトリを作成しておくことをお勧めします。**
- `--name file-server`: コンテナに `file-server` という名前を付けます。

#### 4. アクセス方法

- **管理者用 (ファイルのアップロード・ダウンロード)**
  - ブラウザで `http://localhost:8080` を開きます。
  - `.env` ファイルで設定したパスワードを入力してログインします。
- **公開用 (ファイルの閲覧)**
  - ブラウザで `http://localhost:80` を開きます。

