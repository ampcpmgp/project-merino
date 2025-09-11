#!/usr/bin/env bash

set -euo pipefail

echo "ℹ️ cloudflared を起動中..."
cloudflared tunnel run --token ${CLOUDFLARED_TOKEN}
