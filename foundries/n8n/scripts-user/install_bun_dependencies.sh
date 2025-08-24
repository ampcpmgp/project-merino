#!/usr/bin/env bash

set -euo pipefail

# n8n の実行に必要、出来れば bun に統一したい
echo "ℹ️ fnm をインストール中..."
curl -fsSL https://fnm.vercel.app/install | bash
echo "✅ fnm のインストールが完了しました。"

echo "ℹ️ bun をインストール中..."
curl -fsSL https://bun.sh/install | bash
echo "✅ bun のインストールが完了しました。"

cat <<'EOF' >> ~/.bash_profile
# fnm
FNM_PATH="/home/appuser/.local/share/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="$FNM_PATH:$PATH"
  eval "`fnm env`"
fi

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
EOF

source ~/.bash_profile

echo "ℹ️ Node.js をインストール中..."
fnm install v24
fnm default v24
echo "✅ Node.js のインストールが完了しました。"

echo "ℹ️ bun 依存関係をインストール中..."
bun add -g \
  n8n@1.107.4 \
  @anthropic-ai/claude-code@1.0.89 \
  ccusage@16.2.0 \
  yarn@1.22.22 \
  opencode-ai@0.5.18 \
  @charmland/crush@0.7.1 \
  minimist@1.2.8 \
  chai@6.0.1

echo "✅ bun 依存関係がインストールされました。"
