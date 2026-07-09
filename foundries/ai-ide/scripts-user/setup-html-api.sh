#!/usr/bin/env bash
# setup-html-api.sh — html-api を /workspace へ seed / 更新（冪等・再実行可能）
set -euo pipefail

echo "[setup-html-api] Starting..."

HTML_APP_SRC="/home/appuser/app/html-api"
HTML_APP_DST="/workspace/private/html-api"

# rsync で差分コピー（ソース側の変更のみ反映、ユーザーデータは除外）
echo "[setup-html-api] Syncing html-api to /workspace..."
rsync -a --info=PROGRESS2 \
  --exclude='/user_state/' \
  "$HTML_APP_SRC/" "$HTML_APP_DST/"
echo "[setup-html-api] ✅ html-api synced to ${HTML_APP_DST}"

# スクリプトディレクトリ（なければ作成、既存ユーザースクリプトは保持）
if [ ! -d "${HTML_APP_DST}/scripts" ]; then
    mkdir -p "${HTML_APP_DST}/scripts"
    echo "[setup-html-api] Created scripts directory"
fi

# html-data ディレクトリ
if [ ! -d "/workspace/private/html-data" ]; then
    mkdir -p "/workspace/private/html-data"
fi

echo "[setup-html-api] Done."
