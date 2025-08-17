#!/usr/bin/env bash

set -euo pipefail

# Install pnpm
echo "ℹ️ pnpm をインストール中..."
curl -fsSL https://get.pnpm.io/install.sh | sh -
echo "✅ pnpm v$(pnpm --version) がインストールされました。"

# https://docs.n8n.io/hosting/installation/npm/
pnpm install --dangerously-allow-all-builds -g n8n sqlite3 minimist chai claude-code ccusage crush opencode-ai @charmland/crush

# https://docs.n8n.io/hosting/configuration/environment-variables/task-runners/
export N8N_RUNNERS_ENABLED=true

# https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
export N8N_PORT=8100
# export N8N_EDITOR_BASE_URL="https://$RUNPOD_POD_ID-$N8N_PORT.proxy.runpod.net"

# https://docs.n8n.io/hosting/configuration/environment-variables/endpoints/
# export WEBHOOK_URL="$N8N_EDITOR_BASE_URL"

# https://docs.n8n.io/hosting/configuration/environment-variables/security/
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true

# https://docs.n8n.io/hosting/configuration/configuration-examples/modules-in-code-node/
export NODE_FUNCTION_ALLOW_BUILTIN=*
export NODE_FUNCTION_ALLOW_EXTERNAL=minimist,chai

echo "ℹ️ n8n を起動中..."
n8n start
