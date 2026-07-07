#!/usr/bin/env bash
# setup-htmx-app.sh — /workspace への htmx-app 初回seed（最小構成）
set -euo pipefail

echo "[setup-htmx-app] Starting..."

HTMX_APP_SRC="/home/appuser/app/htmx-app"
HTMX_APP_DST="/workspace/private/htmx-app"

# htmx-app 本体を初回のみ /workspace に seed
if [ ! -d "$HTMX_APP_DST" ]; then
    echo "[setup-htmx-app] First boot — seeding htmx-app to /workspace..."
    cp -r "$HTMX_APP_SRC" "$HTMX_APP_DST"
    echo "[setup-htmx-app] ✅ htmx-app seeded to ${HTMX_APP_DST}"
else
    echo "[setup-htmx-app] htmx-app already exists in /workspace — skipping seed"
fi

# スクリプトディレクトリ（なければ作成）
if [ ! -d "${HTMX_APP_DST}/scripts" ]; then
    mkdir -p "${HTMX_APP_DST}/scripts"
    echo "[setup-htmx-app] Created scripts directory"
fi

# htmx-data ディレクトリ
if [ ! -d "/workspace/private/htmx-data" ]; then
    mkdir -p "/workspace/private/htmx-data"
fi

echo "[setup-htmx-app] Done."
