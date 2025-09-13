#!/usr/bin/env bash

set -euo pipefail

# 引数でポート番号が指定されているかチェック
if [ -z "$1" ]; then
  echo "ℹ️ エラー: ポート番号が指定されていません。"
  echo "ℹ️ 使い方: $0 <ポート番号>"
  exit 1
fi

PORT=$1
HOST="localhost"

echo "ℹ️ ${HOST}:${PORT} が利用可能になるまで待機します..."

# 指定されたポートが開くまで1秒ごとにチェック
while ! nc -z ${HOST} ${PORT}; do
  sleep 1
done

echo "✅ ${HOST}:${PORT} が利用可能になりました。"
