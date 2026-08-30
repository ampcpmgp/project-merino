#!/usr/bin/env bash
set -euo pipefail

# FlashVSR RunPod Pod 起動コマンド
# RunPod Pod 作成時に「Custom deploy」または「start command」に指定

export TERM="xterm"
export DEBIAN_FRONTEND="noninteractive"

echo "🔵 Installing system dependencies..."
apt-get update
apt-get install -y git wget git-lfs ffmpeg

echo "🔵 Cloning ComfyUI..."
cd /root
git clone https://github.com/comfyanonymous/ComfyUI.git --depth 1

echo "🔵 Installing FlashVSR custom node..."
cd /root/ComfyUI/custom_nodes
git clone https://github.com/1038lab/ComfyUI-FlashVSR.git --depth 1

echo "🔵 Downloading FlashVSR models..."
mkdir -p /root/ComfyUI/models/FlashVSR
cd /root/ComfyUI/models/FlashVSR
wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Wan2_1-T2V-1_3B_FlashVSR_fp32.safetensors
wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Wan2_1_FlashVSR_TCDecoder_fp32.safetensors
wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Wan2_1_FlashVSR_LQ_proj_model_bf16.safetensors
wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Wan2.1_VAE.safetensors
wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Prompt.safetensors

echo "🔵 Installing Python dependencies..."
cd /root/ComfyUI
pip install -r requirements.txt
pip install einops safetensors imageio imageio-ffmpeg

echo "✅ Setup complete. Launching ComfyUI..."
cd /root/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
