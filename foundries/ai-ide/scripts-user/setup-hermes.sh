#!/usr/bin/env bash

set -euo pipefail

echo "[setup-hermes] Starting..."

# 既存の hermes 設定を復元
if [ -f $HERMES_BACKUP_PATH ]; then
    echo "[setup-hermes] Found $HERMES_BACKUP_PATH — extracting to /home/appuser ..."
    tar -xzf $HERMES_BACKUP_PATH -C /home/appuser
fi

echo "[setup-hermes] Installing hermes-agent (latest main branch) ..."
# POSTINSTALL_MODE を無効化し、--skip-setup で wizard をスキップ
export POSTINSTALL_MODE=false
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash -s -- --skip-setup

echo "[setup-hermes] Installing faster-whisper for local STT ..."
VENV_PYTHON="/home/appuser/.hermes/hermes-agent/venv/bin/python"
"$VENV_PYTHON" -m ensurepip --upgrade
"$VENV_PYTHON" -m pip install faster-whisper

echo "[setup-hermes] Done."
