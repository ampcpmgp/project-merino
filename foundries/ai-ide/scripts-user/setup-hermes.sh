#!/usr/bin/env bash

set -euo pipefail

echo "[setup-hermes] Starting..."

# 既存の hermes 設定を復元
if [ -f "$HERMES_BACKUP_PATH" ]; then
    echo "[setup-hermes] Found $HERMES_BACKUP_PATH — extracting to /home/appuser ..."
    tar -xzf "$HERMES_BACKUP_PATH" -C /home/appuser
fi

# faster-whisper は hermes-agent の venv に入れる（pip install は冪等）
if [ -f /home/appuser/.hermes/hermes-agent/venv/bin/python ]; then
    echo "[setup-hermes] Installing faster-whisper for local STT ..."
    VENV_PYTHON="/home/appuser/.hermes/hermes-agent/venv/bin/python"
    "$VENV_PYTHON" -m ensurepip --upgrade
    "$VENV_PYTHON" -m pip install faster-whisper numpy
fi

echo "[setup-hermes] Done."
