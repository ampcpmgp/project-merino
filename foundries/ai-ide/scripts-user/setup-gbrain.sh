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
    git config user.email "appuser@localhost"
    git config user.name "appuser"
    echo '# My Brain' > README.md
    git add README.md && git commit -m "init brain"
fi

echo "[setup-gbrain] Done."
