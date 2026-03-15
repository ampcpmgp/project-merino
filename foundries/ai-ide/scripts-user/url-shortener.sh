#!/usr/bin/env bash

set -euo pipefail

SHORTCUTS_FILE="/workspace/url-shortcuts.txt"

usage() {
    echo "使い方: $0 <コマンド> [引数]"
    echo ""
    echo "コマンド:"
    echo "  add <キー> <URL>   - 短縮URLを追加または更新する"
    echo "  remove <キー>      - 短縮URLを削除する"
    echo "  list               - 短縮URLの一覧を表示する"
    echo ""
    echo "例:"
    echo "  $0 add gh https://github.com"
    echo "  $0 list"
    echo "  $0 remove gh"
    exit 1
}

# 設定ファイルが存在しない場合は初期化する
if [ ! -f "$SHORTCUTS_FILE" ]; then
    echo "# 短縮URL設定ファイル" > "$SHORTCUTS_FILE"
    echo "# 形式: <キー> <URL>" >> "$SHORTCUTS_FILE"
    echo "# 例: gh https://github.com" >> "$SHORTCUTS_FILE"
    echo "ℹ️ 設定ファイルを作成しました: $SHORTCUTS_FILE"
fi

case "${1:-}" in
    add)
        if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
            echo "❌ エラー: キーとURLが必要です"
            usage
        fi
        KEY="$2"
        URL="$3"
        if grep -q "^${KEY}[[:space:]]" "$SHORTCUTS_FILE"; then
            sed -i "/^${KEY}[[:space:]]/d" "$SHORTCUTS_FILE"
            printf '%s\t%s\n' "$KEY" "$URL" >> "$SHORTCUTS_FILE"
            echo "✅ 短縮URLを更新しました: /s/${KEY} -> ${URL}"
        else
            printf '%s\t%s\n' "$KEY" "$URL" >> "$SHORTCUTS_FILE"
            echo "✅ 短縮URLを追加しました: /s/${KEY} -> ${URL}"
        fi
        ;;
    remove)
        if [ -z "${2:-}" ]; then
            echo "❌ エラー: キーが必要です"
            usage
        fi
        KEY="$2"
        if grep -q "^${KEY}[[:space:]]" "$SHORTCUTS_FILE"; then
            sed -i "/^${KEY}[[:space:]]/d" "$SHORTCUTS_FILE"
            echo "✅ 短縮URLを削除しました: /s/${KEY}"
        else
            echo "❌ 短縮URLが見つかりません: /s/${KEY}"
            exit 1
        fi
        ;;
    list)
        echo "📋 短縮URLの一覧:"
        if grep -v "^#" "$SHORTCUTS_FILE" | grep -v "^[[:space:]]*$" | grep -q .; then
            grep -v "^#" "$SHORTCUTS_FILE" | grep -v "^[[:space:]]*$" | while IFS=$'\t' read -r key url; do
                echo "  /s/${key} -> ${url}"
            done
        else
            echo "  (登録なし)"
        fi
        ;;
    *)
        usage
        ;;
esac
