#!/usr/bin/env bash

set -euo pipefail

# Hermes browser_exec (browser-use CLI) が接続するためのヘッドレス Chrome を
# 常時起動する。browser-use harness は「起動済み Chrome」または CDP エンド
# ポイント（browser.cdp_url / BU_CDP_URL）に接続する設計のため、コンテナ内で
# この Chrome を常駐させて --remote-debugging-port で待ち受ける。

# puppeteer がインストールした Chrome バイナリを動的に解決する。
# バージョンが変わっても最新の chrome-linux64 を選ぶ。
CHROME_CANDIDATES=(/home/appuser/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome)

CHROME=""
for candidate in "${CHROME_CANDIDATES[@]}"; do
    if [ -x "$candidate" ]; then
        CHROME="$candidate"
        break
    fi
done

if [ -z "$CHROME" ]; then
    echo "ERROR: puppeteer Chrome binary not found under /home/appuser/.cache/puppeteer/chrome/" >&2
    exit 1
fi

echo "ℹ️ Starting headless Chrome: $CHROME"
echo "ℹ️ CDP endpoint: http://127.0.0.1:9333"

# 専用 user-data-dir を使い、リモートデバッグポート 9333 で待ち受ける。
# --no-first-run / --no-default-browser-check で起動時のダイアログを抑制。
exec "$CHROME" \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --no-first-run \
    --no-default-browser-check \
    --remote-debugging-port=9333 \
    --user-data-dir=/tmp/headless-chrome-profile \
    about:blank
