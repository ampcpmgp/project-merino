#!/usr/bin/env bash
# setup-html-api.sh — html-api を /workspace へ seed（初回のみ cp、以降スキップ）
set -euo pipefail

echo "[setup-html-api] Starting..."

HTML_APP_SRC="/home/appuser/app/html-api"
HTML_APP_DST="/workspace/private/html-api"

# 初回のみ cp で seed。2回目以降はスキップ（既存ユーザーデータを保持）
if [ ! -d "${HTML_APP_DST}" ]; then
    echo "[setup-html-api] Copying html-api to /workspace (first time)..."
    cp -r --no-preserve=ownership,mode "${HTML_APP_SRC}" "${HTML_APP_DST%/*}"
    echo "[setup-html-api] ✅ html-api seeded to ${HTML_APP_DST}"
else
    echo "[setup-html-api] html-api already exists at ${HTML_APP_DST}, skipping copy"
fi

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
