#!/usr/bin/env bash

set -euo pipefail

CURRENT_DIR=$(cd $(dirname $0); pwd)

"${CURRENT_DIR}/wait-for-port.sh" "80"

"${CURRENT_DIR}/wait-for-port.sh" "8080"

"${CURRENT_DIR}/wait-for-port.sh" "8100"

echo "ℹ️ cloudflared を起動中..."
cloudflared tunnel run --token "${CLOUDFLARED_TOKEN}"
