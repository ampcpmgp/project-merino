#!/bin/bash
set -e

WORKSPACE_DIR="/workspace/whiteboard"
# スクリプトの位置からホワイトボードディレクトリを特定
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_DIR="$SCRIPT_DIR/../storage/drawings"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring data from workspace..."

# ローカルディレクトリ作成
mkdir -p "$LOCAL_DIR"

# 永続ストレージから圧縮ファイルを検索して解凍
if [ -d "$WORKSPACE_DIR" ]; then
    for archive in "$WORKSPACE_DIR"/*.tar.gz; do
        if [ -f "$archive" ]; then
            filename=$(basename "$archive" .tar.gz)
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Extracting: $filename"
            tar -xzf "$archive" -C "$LOCAL_DIR" 2>/dev/null || true
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restored: $filename"
        fi
    done
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] No workspace data found"
fi

# パーミッション設定
chmod -R 755 "$LOCAL_DIR" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restore complete"
