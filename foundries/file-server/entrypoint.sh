#!/bin/bash

# 環境変数が設定されていなければデフォルト値を使用
# HOSTNAMEには、コンテナ実行時にホストのIPアドレスやドメイン名を渡すことを想定
HOST=${HOSTNAME:-"localhost"}

# 起動メッセージとURLをログに出力
echo "=========================================================="
echo "🚀 Servers are running!"
echo ""
echo "  - Nginx Server:       http://${HOST}"
echo "  - code-server:        http://${HOST}:8080"
echo ""
echo "=========================================================="

# CMDで渡されたコマンド（supervisord）を実行
exec "$@"
