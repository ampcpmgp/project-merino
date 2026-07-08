#!/usr/bin/env bash
# setup-html-api.sh — /workspace への html-api 初回seed（最小構成）
set -euo pipefail

echo "[setup-html-api] Starting..."

HTMX_APP_SRC="/home/appuser/app/html-api"
HTMX_APP_DST="/workspace/private/html-api"

echo "[setup-html-api] htmx-app 本体を初回のみ /workspace に seed"
if [ ! -d "$HTMX_APP_DST" ]; then
    echo "[setup-html-api] First boot — seeding html-api to /workspace..."
    cp -r "$HTMX_APP_SRC" "$HTMX_APP_DST"
    echo "[setup-html-api] ✅ html-api seeded to ${HTMX_APP_DST}"
else
    echo "[setup-html-api] html-api already exists in /workspace — skipping seed"
fi

# スクリプトディレクトリ（なければ作成）
if [ ! -d "${HTMX_APP_DST}/scripts" ]; then
    mkdir -p "${HTMX_APP_DST}/scripts"
    echo "[setup-html-api] Created scripts directory"
fi

# htmx-data ディレクトリ
if [ ! -d "/workspace/private/html-data" ]; then
    mkdir -p "/workspace/private/html-data"
fi

echo "[setup-html-api] Done."
