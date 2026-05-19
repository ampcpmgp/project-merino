#!/usr/bin/env bash
set -euo pipefail

echo "[setup-gbrain] Starting..."

# Restore from backup if exists
if [ -f "$GBRAIN_BACKUP_PATH" ]; then
    echo "[setup-gbrain] Found $GBRAIN_BACKUP_PATH — extracting to /home/appuser ..."
    tar -xzf "$GBRAIN_BACKUP_PATH" -C /home/appuser
fi

if [ -f "$BRAIN_BACKUP_PATH" ]; then
    echo "[setup-gbrain] Found $BRAIN_BACKUP_PATH — extracting to /home/appuser ..."
    tar -xzf "$BRAIN_BACKUP_PATH" -C /home/appuser
fi

# Ensure gbrain data directory exists
mkdir -p /home/appuser/.gbrain

# Ensure brain repo exists
mkdir -p /home/appuser/brain
if [ ! -d /home/appuser/brain/.git ]; then
    cd /home/appuser/brain
    git init
fi

# Upgrade: apply schema migrations and show migration notes
# (source code is updated via Docker image rebuild)

echo "[setup-gbrain] Running gbrain init (idempotent schema migration)..."
gbrain init

echo "[setup-gbrain] Running gbrain post-upgrade..."
gbrain post-upgrade

echo "[setup-gbrain] Done."
