#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd $(dirname $0); pwd)
ENV_FILE="${SCRIPT_DIR}/.env"
export $(grep -E '^N8N_URL=|AWS_ACCESS_KEY_ID=|^AWS_SECRET_ACCESS_KEY=|^AWS_DEFAULT_REGION=|^AWS_ENDPOINT_URL=|^AWS_BUCKET_NAME=|^CLOUDFLARED_TOKEN=' "${ENV_FILE}")

echo "ℹ️ pnpm をインストール中..."
# curl -fsSL https://get.pnpm.io/install.sh | sh -
echo "✅ pnpm v$(pnpm --version) がインストールされました。"

# https://docs.n8n.io/hosting/installation/npm/
# pnpm install --dangerously-allow-all-builds -g n8n sqlite3 minimist chai claude-code ccusage crush opencode-ai @charmland/crush

###

# 独自設定（プレフィックスで明確に区別）
export CUSTOM_N8N_TAR_FILE="n8n.tar.gz"
export CUSTOM_N8N_TAR_FILE_PATH="$HOME/$CUSTOM_N8N_TAR_FILE"
export CUSTOM_N8N_BACKUP_DIR="$HOME/n8n_backup"

# https://docs.n8n.io/hosting/configuration/configuration-examples/user-folder/
export N8N_USER_FOLDER="$HOME/n8n_data"

### 
if aws s3api head-object --region "$AWS_DEFAULT_REGION" --endpoint-url "$AWS_ENDPOINT_URL" --bucket "$AWS_BUCKET_NAME" --key "$CUSTOM_N8N_TAR_FILE" > /dev/null 2>&1; then
  echo "ℹ️ ファイル s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE が見つかりました。ダウンロードと展開を開始します。"

  aws s3 cp --region "$AWS_DEFAULT_REGION" --endpoint-url "$AWS_ENDPOINT_URL" "s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE" "$CUSTOM_N8N_TAR_FILE_PATH"
  tar --use-compress-program="pigz" -xf "$CUSTOM_N8N_TAR_FILE_PATH" -C "$HOME"
  echo "✅ 展開が完了しました"
else
  # ファイルが存在しない場合の処理
  echo "ℹ️ ファイル s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE が存在しません。処理をスキップします。"
fi

###

# https://docs.n8n.io/hosting/configuration/environment-variables/task-runners/
export N8N_RUNNERS_ENABLED=true
# https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
export N8N_PORT=8100
export N8N_EDITOR_BASE_URL="${N8N_URL}"
# https://docs.n8n.io/hosting/configuration/environment-variables/endpoints/
export WEBHOOK_URL="${N8N_URL}"
# https://docs.n8n.io/hosting/configuration/environment-variables/security/
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
# https://docs.n8n.io/hosting/configuration/configuration-examples/modules-in-code-node/
export NODE_FUNCTION_ALLOW_BUILTIN=*
export NODE_FUNCTION_ALLOW_EXTERNAL=minimist,chai
# https://docs.n8n.io/hosting/configuration/configuration-examples/time-zone/
export GENERIC_TIMEZONE=Asia/Tokyo

echo "ℹ️ n8n を起動中..."
n8n start &
sleep 10

echo "ℹ️ cloudflared をバックグラウンドで起動中..."
cloudflared tunnel run --token ${CLOUDFLARED_TOKEN} &

sleep infinity
