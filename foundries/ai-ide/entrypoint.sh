#!/usr/bin/env bash

set -euo pipefail

THIS_DIR=$(cd $(dirname $0); pwd)
USER_SCRIPT_DIR=$THIS_DIR/scripts-user

# n8nとcloudflaredをバックグラウンドで実行
su - appuser -c "${USER_SCRIPT_DIR}/run_n8n.sh &"
su - appuser -c "${USER_SCRIPT_DIR}/run_cloudflared.sh &"

# メインプロセスが終了しないように待機
wait
