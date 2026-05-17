#!/usr/bin/env bash
# wait-for-cmd-available.sh
# Docker 上で指定したコマンドが PATH に見つかるようになるまで待機する
#
# 使い方:
#   /home/appuser/app/scripts-user/wait-for-cmd-available.sh hermes
#   WAIT_INTERVAL=2 WAIT_MAX_RETRIES=30 /home/appuser/app/scripts-user/wait-for-cmd-available.sh node

set -euo pipefail

INTERVAL="${WAIT_INTERVAL:-5}"
MAX_RETRIES="${WAIT_MAX_RETRIES:-120}"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <command>"
    echo "Environment: WAIT_INTERVAL (default: 1), WAIT_MAX_RETRIES (default: 600=10分)"
    exit 1
fi

CMD="$1"

echo "[wait-for-cmd-available] Waiting for '${CMD}' to become available..."
echo "[wait-for-cmd-available] Interval: ${INTERVAL}s, Max retries: ${MAX_RETRIES}"

count=0
while true; do
    if command -v "${CMD}" >/dev/null 2>&1; then
        echo "[wait-for-cmd-available] '${CMD}' is now available."
        exit 0
    fi

    count=$((count + 1))
    if [ "${MAX_RETRIES}" -gt 0 ] && [ "${count}" -ge "${MAX_RETRIES}" ]; then
        echo "[wait-for-cmd-available] Max retries (${MAX_RETRIES}) exceeded."
        exit 1
    fi

    # echo "[wait-for-cmd-available] Retry ${count}: '${CMD}' not found, waiting ${INTERVAL}s..."
    sleep "${INTERVAL}"
done
