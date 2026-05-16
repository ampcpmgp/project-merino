#!/usr/bin/env bash

set -euo pipefail

echo "[setup-hermes] Starting..."

# 既存の hermes 設定を復元
if [ -f /workspace/hermes_backup/hermes.tar.gz ]; then
    echo "[setup-hermes] Found /workspace/hermes_backup/hermes.tar.gz — extracting to /home/appuser ..."
    tar -xzf /workspace/hermes_backup/hermes.tar.gz -C /home/appuser
fi

echo "[setup-hermes] Installing hermes-agent (latest main branch) ..."
# POSTINSTALL_MODE を無効化し、--skip-setup で wizard をスキップ
export POSTINSTALL_MODE=false
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash -s

echo "[setup-hermes] Done."
