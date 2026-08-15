#!/usr/bin/env bash

set -euo pipefail

echo "[setup-hermes] Starting..."

# 既存の hermes 設定を復元
if [ -f "$HERMES_BACKUP_PATH" ]; then
    echo "[setup-hermes] Found $HERMES_BACKUP_PATH — extracting to /home/appuser ..."
    tar -xzf "$HERMES_BACKUP_PATH" -C /home/appuser
fi

# browser_exec (browser-use CLI) は起動済み Chrome の CDP エンドポイントに接続する。
# supervisor が run_headless_chrome.sh で :9333 を常時起動するため、ここで
# browser.cdp_url を強制設定する（バックアップの古い config.yaml が cdp_url=''
# のまま復元されても、起動のたびに必ず上書きして browser_exec を機能させる）。
if [ -x /home/appuser/.local/bin/hermes ]; then
    echo "[setup-hermes] Setting browser.cdp_url for headless Chrome ..."
    /home/appuser/.local/bin/hermes config set browser.cdp_url http://127.0.0.1:9333 --force
fi

# faster-whisper は hermes-agent の venv に入れる（pip install は冪等）
if [ -f /home/appuser/.hermes/hermes-agent/venv/bin/python ]; then
    echo "[setup-hermes] Installing faster-whisper for local STT ..."
    VENV_PYTHON="/home/appuser/.hermes/hermes-agent/venv/bin/python"
    "$VENV_PYTHON" -m ensurepip --upgrade
    "$VENV_PYTHON" -m pip install faster-whisper numpy
fi

echo "[setup-hermes] Done."
