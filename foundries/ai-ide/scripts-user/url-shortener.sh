#!/usr/bin/env bash

set -euo pipefail

SHORTCUTS_DIR="/workspace/url-shortcuts"
mkdir -p "$SHORTCUTS_DIR"

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

case "${1:-}" in
    add)
        if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
            echo "❌ エラー: キーとURLが必要です"
            usage
        fi
        echo "$3" > "$SHORTCUTS_DIR/$2"
        echo "✅ 短縮URLを登録しました: /s/$2 -> $3"
        ;;
    remove)
        if [ -z "${2:-}" ]; then
            echo "❌ エラー: キーが必要です"
            usage
        fi
        if [ ! -f "$SHORTCUTS_DIR/$2" ]; then
            echo "❌ 短縮URLが見つかりません: /s/$2"
            exit 1
        fi
        rm "$SHORTCUTS_DIR/$2"
        echo "✅ 短縮URLを削除しました: /s/$2"
        ;;
    list)
        echo "📋 短縮URLの一覧:"
        shopt -s nullglob
        files=("$SHORTCUTS_DIR"/*)
        if [ ${#files[@]} -eq 0 ]; then
            echo "  (登録なし)"
        else
            for f in "${files[@]}"; do
                echo "  /s/$(basename "$f") -> $(cat "$f")"
            done
        fi
        ;;
    *)
        usage
        ;;
esac
