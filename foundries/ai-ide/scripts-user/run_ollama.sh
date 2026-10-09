#!/usr/bin/env bash

set -euo pipefail

# Ollama 埋め込みサーバ
#
# モデルの置き場は /workspace/ollama-models（ホストの 9p マウント）。
# 9p は chmod 不可のため、このパスで `ollama pull` を実行すると
#   Error: chmod /workspace/ollama-models/blobs/sha256-...: operation not permitted
# で必ず失敗する。モデルは scripts-user/ollama-pull.sh で配置する
# （ext4 に pull → cp -r でコピー）。cp は chmod を行わないため 9p でも成功する。

export OLLAMA_MODELS="/workspace/ollama-models"
export OLLAMA_HOST="0.0.0.0:11434"
# 埋め込みは低頻度なので、5分でアンロードしてメモリを解放する
export OLLAMA_KEEP_ALIVE="5m"
export OLLAMA_MAX_LOADED_MODELS="1"

mkdir -p "${OLLAMA_MODELS}"

"${HOME}/app/scripts-user/wait-for-port.sh" "80"

echo "ℹ️ Ollama を起動中... (OLLAMA_MODELS=${OLLAMA_MODELS})"
exec ollama serve
