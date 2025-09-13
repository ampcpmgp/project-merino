#!/usr/bin/env bash

set -euo pipefail

CURRENT_DIR=$(cd $(dirname $0); pwd)

echo "ℹ️ nginx の起動を待機中..."
"${CURRENT_DIR}/wait-for-port.sh" "80"

echo "ℹ️ code-server の起動を待機中..."
"${CURRENT_DIR}/wait-for-port.sh" "8080"

echo "ℹ️ n8n の起動を待機中..."
"${CURRENT_DIR}/wait-for-port.sh" "8100"

echo "ℹ️ cloudflared を起動中..."
cloudflared tunnel run --token "${CLOUDFLARED_TOKEN}"
