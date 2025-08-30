#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd $(dirname $0); pwd)
ENV_FILE="${SCRIPT_DIR}/../.env"
export $(grep '^CLOUDFLARED_TOKEN=' "${ENV_FILE}")

echo "ℹ️ cloudflared を起動中..."
cloudflared tunnel run --token ${CLOUDFLARED_TOKEN}
