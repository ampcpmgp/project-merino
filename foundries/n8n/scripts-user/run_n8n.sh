#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd $(dirname $0); pwd)
ENV_FILE="${SCRIPT_DIR}/../.env"
export $(grep '^N8N_URL=|AWS_ACCESS_KEY_ID=|^AWS_SECRET_ACCESS_KEY=|^AWS_DEFAULT_REGION=' "${ENV_FILE}")

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
echo "ℹ️ n8n を起動中..."
n8n start
