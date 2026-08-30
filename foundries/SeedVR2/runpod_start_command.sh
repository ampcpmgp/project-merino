#!/bin/bash
# SeedVR2 worker 起動コマンド (コミュニティクラウド手動起動用)
# RunPod Serverless(自動) では不要。Community Cloud でこのコマンドを直接実行して
# フレーム分解→SeedVR2推論→2160px調整→出力の流れを検証する。

set -e

# 入力動画 URL か ローカルパス (環境変数から)
VIDEO_URL="${VIDEO_URL:-}"
RES_W="${RES_W:-2160}"
RES_H="${RES_H:-1215}"
SEEDVR_DIR="/app/SeedVR"
WORKDIR="/app/seedvr_work"
OUTDIR="/app/outputs"

mkdir -p "$WORKDIR/input" "$OUTDIR"

echo "=== SeedVR2 worker start ==="
echo "VIDEO_URL=$VIDEO_URL RES_W=$RES_W RES_H=$RES_H"

# 動画をDL(URLの場合)
if [ -n "$VIDEO_URL" ]; then
  echo "Downloading input video..."
  INPUT_VIDEO="$WORKDIR/input.mp4"
  curl -sL "$VIDEO_URL" -o "$INPUT_VIDEO" || { echo "DL failed"; exit 1; }
else
  echo "VIDEO_URL not set. Place input video at $WORKDIR/input.mp4 manually."
  exit 1
fi

# 動画 → フレーム分解 (SeedVR2 はフレーム列想定)
echo "Extracting frames..."
ffmpeg -y -i "$INPUT_VIDEO" -q:v 2 "$WORKDIR/input/frame_%06d.png"

# SeedVR2 推論 (torchrun, 1GPU)
echo "Running SeedVR2..."
torchrun --nproc-per-node 1 \
  "$SEEDVR_DIR/projects/inference_seedvr2_3b.py" \
  --video_path "$WORKDIR/input" \
  --output_dir "$OUTDIR" \
  --seed 0 \
  --res_h "$RES_H" --res_w "$RES_W" \
  --sp_size 1

echo "=== SeedVR2 worker done. Output in $OUTDIR ==="
