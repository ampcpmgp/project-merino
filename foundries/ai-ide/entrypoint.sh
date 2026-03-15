#!/usr/bin/env bash

set -euo pipefail

# 短縮URL設定ファイルが存在しない場合は初期化する
SHORTCUTS_FILE="/workspace/url-shortcuts.txt"
if [ ! -f "$SHORTCUTS_FILE" ]; then
    mkdir -p "$(dirname "$SHORTCUTS_FILE")"
    cat > "$SHORTCUTS_FILE" << 'EOF'
# 短縮URL設定ファイル
# 形式: <キー> <URL>
# 例: gh https://github.com
# 管理スクリプト: /home/appuser/app/scripts-user/url-shortener.sh
EOF
    chown appuser:appuser "$SHORTCUTS_FILE"
    echo "ℹ️ 短縮URL設定ファイルを作成しました: $SHORTCUTS_FILE"
fi

exec "$@"
