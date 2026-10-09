#!/usr/bin/env bash
# ollama-pull.sh — Ollama モデルを /workspace/ollama-models へ配置する
#
# 【なぜ普通に pull できないか】
#   1. /workspace は 9p マウント。9p は chmod 不可のため、ここを
#      OLLAMA_MODELS にしたサーバで pull すると必ず失敗する:
#        Error: chmod /workspace/ollama-models/blobs/sha256-...: operation not permitted
#   2. OLLAMA_MODELS は【サーバ側】の環境変数。クライアント側で
#      `OLLAMA_MODELS=... ollama pull` と指定しても効かない（実測確認済み）。
#      常駐サーバが動いていると、そのサーバの OLLAMA_MODELS に落ちてしまう。
#
# 【回避策・実測で確認済み】
#   専用ポート(11435)に ext4($HOME) を指した一時サーバを立てて pull し、
#   cp -r で /workspace へ配置する。cp は chmod を行わないため 9p でも成功し、
#   常駐サーバは配置済みモデルをそのまま読み出せる。
#
# 使い方:
#   scripts-user/ollama-pull.sh <model>
set -euo pipefail

MODEL="${1:?usage: ollama-pull.sh <model>}"

EXT4_DIR="${HOME}/ollama-models-tmp"
TARGET_DIR="/workspace/ollama-models"
TMP_PORT=11435

mkdir -p "${EXT4_DIR}" "${TARGET_DIR}"

# 一時サーバ（ext4 を指す）を起動
echo "[ollama-pull] 一時サーバを ${TMP_PORT} で起動中 (ext4: ${EXT4_DIR})"
OLLAMA_MODELS="${EXT4_DIR}" OLLAMA_HOST="127.0.0.1:${TMP_PORT}" \
    ollama serve >/tmp/ollama-pull.log 2>&1 &
TMP_PID=$!
trap 'kill "${TMP_PID}" 2>/dev/null || true' EXIT

# 起動待ち
for _ in $(seq 1 30); do
    curl -sf "http://127.0.0.1:${TMP_PORT}/api/tags" >/dev/null 2>&1 && break
    sleep 1
done

echo "[ollama-pull] pull ${MODEL}"
OLLAMA_HOST="127.0.0.1:${TMP_PORT}" ollama pull "${MODEL}"

# 一時サーバ停止（ファイルを閉じさせてからコピー）
kill "${TMP_PID}" 2>/dev/null || true
wait "${TMP_PID}" 2>/dev/null || true
trap - EXIT

echo "[ollama-pull] cp -r ${EXT4_DIR} -> ${TARGET_DIR}"
cp -r "${EXT4_DIR}/." "${TARGET_DIR}/"

echo "[ollama-pull] ✅ ${MODEL} を ${TARGET_DIR} に配置しました"
