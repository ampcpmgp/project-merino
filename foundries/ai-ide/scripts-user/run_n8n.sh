#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd $(dirname $0); pwd)
ENV_FILE="${SCRIPT_DIR}/../.env"
export $(grep -v '^\s*#' "$ENV_FILE" | grep -v '^$' | xargs)

# 独自設定（プレフィックスで明確に区別）
export CUSTOM_N8N_TAR_FILE="n8n.tar.gz"
export CUSTOM_N8N_TAR_FILE_PATH="$HOME/$CUSTOM_N8N_TAR_FILE"
export CUSTOM_N8N_BACKUP_DIR="$HOME/n8n_backup"
export CUSTOM_N8N_LOCAL_BACKUP_DIR="/mnt/c/_pmerino"

# https://docs.n8n.io/hosting/configuration/configuration-examples/user-folder/
export N8N_USER_FOLDER="$HOME/n8n_data"

# リトライ設定を強化
aws configure set default.retry_mode adaptive
aws configure set default.max_attempts 10
aws configure set default.cli_read_timeout 300
aws configure set default.cli_connect_timeout 300
aws configure set default.s3.multipart_chunksize 5MB # デフォルトは8MB
aws configure set default.s3.max_concurrent_requests 20

LOCAL_ARCHIVE_PATH="$CUSTOM_N8N_LOCAL_BACKUP_DIR/$CUSTOM_N8N_TAR_FILE"

if [ -f "$LOCAL_ARCHIVE_PATH" ]; then
  echo "ℹ️ ローカルバックアップ $LOCAL_ARCHIVE_PATH が見つかりました。展開を開始します。"
  tar --use-compress-program="pigz" -xf "$LOCAL_ARCHIVE_PATH" -C "$HOME"
  echo "✅ ローカルからの展開が完了しました。"

# 永続ストレージに CUSTOM_N8N_TAR_FILE が存在する場合はダウンロードと展開を行う
elif  aws s3api head-object --region "$AWS_DEFAULT_REGION" --endpoint-url "$AWS_ENDPOINT_URL" --bucket "$AWS_BUCKET_NAME" --key "$CUSTOM_N8N_TAR_FILE" > /dev/null 2>&1; then
  echo "ℹ️ ローカルにバックアップが見つかりません。"
  echo "ℹ️ ファイル s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE が見つかりました。ダウンロードと展開を開始します。"

  aws s3 cp --region "$AWS_DEFAULT_REGION" --endpoint-url "$AWS_ENDPOINT_URL" "s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE" "$CUSTOM_N8N_TAR_FILE_PATH"
  tar --use-compress-program="pigz" -xf "$CUSTOM_N8N_TAR_FILE_PATH" -C "$HOME"
  echo "✅ 展開が完了しました"
else
  # ファイルが存在しない場合の処理
  echo "ℹ️ ローカルにもS3にもバックアップが存在しません。初期状態で起動します。"
fi

# https://docs.n8n.io/hosting/configuration/environment-variables/task-runners/
export N8N_RUNNERS_ENABLED=true
# https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
export N8N_PORT=8100
export N8N_EDITOR_BASE_URL="${N8N_URL}"
export N8N_PUSH_BACKEND=websocket
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

while ! nc -z localhost ${N8N_PORT}; do
  sleep 1
done

echo "✅ Port ${N8N_PORT} で n8n が起動しました"

