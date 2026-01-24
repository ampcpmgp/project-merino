#!/usr/bin/env bash

set -euo pipefail

# 独自設定（プレフィックスで明確に区別）
export CUSTOM_N8N_TAR_FILE="n8n.tar.gz"
export CUSTOM_N8N_TAR_FILE_PATH="$HOME/$CUSTOM_N8N_TAR_FILE"
export CUSTOM_N8N_BACKUP_DIR="$HOME/n8n_backup"

# https://docs.n8n.io/hosting/configuration/configuration-examples/user-folder/
export N8N_USER_FOLDER="$HOME/n8n_data"

cd $HOME

# 永続ストレージに CUSTOM_N8N_TAR_FILE が存在する場合はダウンロードと展開を行う
if aws s3api head-object --region "$AWS_DEFAULT_REGION" --endpoint-url "$AWS_ENDPOINT_URL" --bucket "$AWS_BUCKET_NAME" --key "$CUSTOM_N8N_TAR_FILE" > /dev/null 2>&1; then
  echo "ℹ️ ファイル s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE が見つかりました。ダウンロードと展開を開始します。"

  aws s3 cp --region "$AWS_DEFAULT_REGION" --endpoint-url "$AWS_ENDPOINT_URL" "s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE" "$CUSTOM_N8N_TAR_FILE_PATH"
  tar --use-compress-program="pigz" -xf "$CUSTOM_N8N_TAR_FILE_PATH" -C "$HOME"
  echo "✅ 展開が完了しました"
else
  # ファイルが存在しない場合の処理
  echo "ℹ️ S3にバックアップが存在しません。初期状態で起動します。"
fi

# https://docs.n8n.io/hosting/configuration/environment-variables/task-runners/
export N8N_RUNNERS_ENABLED=true
export N8N_RUNNERS_MAX_OLD_SPACE_SIZE=16384
export NODE_OPTIONS=--max-old-space-size=16384
# https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
export N8N_PORT=8100
export N8N_EDITOR_BASE_URL="${N8N_URL}"
export N8N_PUSH_BACKEND=websocket
# https://docs.n8n.io/hosting/configuration/environment-variables/endpoints/
export WEBHOOK_URL="${N8N_URL}"
export N8N_PAYLOAD_SIZE_MAX=256
# https://docs.n8n.io/hosting/configuration/environment-variables/security/
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false
export N8N_RESTRICT_FILE_ACCESS_TO=""
# https://docs.n8n.io/hosting/configuration/configuration-examples/modules-in-code-node/
export NODE_FUNCTION_ALLOW_BUILTIN=*
export NODE_FUNCTION_ALLOW_EXTERNAL="minimist,chai,cross-fetch,@fal-ai/client"
# https://docs.n8n.io/hosting/configuration/configuration-examples/time-zone/
export GENERIC_TIMEZONE=Asia/Tokyo
# https://docs.n8n.io/hosting/configuration/environment-variables/database/#sqlite
export DB_SQLITE_POOL_SIZE=10
# https://docs.n8n.io/hosting/configuration/environment-variables/task-runners/#n8n-instance-environment-variables
export N8N_RUNNERS_TASK_TIMEOUT=3000
# https://docs.n8n.io/embed/configuration/#environment-variables
export NODES_EXCLUDE=[]
# https://docs.n8n.io/hosting/configuration/environment-variables/binary-data/
export N8N_DEFAULT_BINARY_DATA_MODE=filesystem

# refs:
# https://community.n8n.io/t/problem-with-read-write-node-after-update/241733/2

echo "ℹ️ n8n を起動中..."
exec n8n start
