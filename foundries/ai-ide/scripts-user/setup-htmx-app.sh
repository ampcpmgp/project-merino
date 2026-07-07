#!/usr/bin/env bash
# setup-htmx-app.sh — /workspace への htmx-app 初回seed
set -euo pipefail

echo "[setup-htmx-app] Starting..."

HTMX_APP_SRC="/home/appuser/app/htmx-app"
HTMX_APP_DST="/workspace/private/htmx-app"
SCRIPTS_DIR="${HTMX_APP_DST}/scripts"

# htmx-app 本体を初回のみ /workspace にseed
if [ ! -d "$HTMX_APP_DST" ]; then
    echo "[setup-htmx-app] First boot — seeding htmx-app from built-in to /workspace..."
    cp -r "$HTMX_APP_SRC" "$HTMX_APP_DST"
    echo "[setup-htmx-app] ✅ htmx-app seeded to ${HTMX_APP_DST}"
else
    echo "[setup-htmx-app] htmx-app already exists in /workspace — skipping seed"
fi

# スクリプトディレクトリ（なければ作成、あればユーザーの変更を維持）
if [ ! -d "$SCRIPTS_DIR" ]; then
    mkdir -p "$SCRIPTS_DIR"
    echo "[setup-htmx-app] Created scripts directory: ${SCRIPTS_DIR}"

    # サンプルスクリプトを配置（HTMX_APP_SRC にあれば）
    if [ -f "${HTMX_APP_SRC}/scripts-sample/hello.ts" ]; then
        cp "${HTMX_APP_SRC}/scripts-sample/"* "$SCRIPTS_DIR/"
        echo "[setup-htmx-app] Copied sample scripts to ${SCRIPTS_DIR}"
    fi
fi

# built-in manifest を /workspace にコピー（初回のみ）
if [ ! -f "${HTMX_APP_DST}/built-in/manifest.json" ]; then
    mkdir -p "${HTMX_APP_DST}/built-in"
    if [ -f "${HTMX_APP_SRC}/built-in/manifest.json" ]; then
        cp "${HTMX_APP_SRC}/built-in/manifest.json" "${HTMX_APP_DST}/built-in/manifest.json"
    fi
fi

# htmx-data ディレクトリ
if [ ! -d "/workspace/private/htmx-data" ]; then
    mkdir -p "/workspace/private/htmx-data"
    echo "[setup-htmx-app] Created data directory: /workspace/private/htmx-data"
fi

echo "[setup-htmx-app] Done."
