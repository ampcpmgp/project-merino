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
git clone https://github.com/naxci1/ComfyUI-FlashVSR_Stable.git --depth 1

echo "🔵 Downloading FlashVSR models..."
mkdir -p /root/ComfyUI/models/FlashVSR
cd /root/ComfyUI/models/FlashVSR
wget -q https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1/resolve/main/LQ_proj_in.ckpt
wget -q https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1/resolve/main/TCDecoder.ckpt
wget -q https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1/resolve/main/diffusion_pytorch_model_streaming_dmd.safetensors
wget -q https://huggingface.co/lightx2v/Autoencoders/resolve/main/Wan2.1_VAE.pth

echo "🔵 Installing Python dependencies..."
cd /root/ComfyUI
pip install -r requirements.txt
cd /root/ComfyUI/custom_nodes/ComfyUI-FlashVSR_Stable
pip install einops safetensors tqdm pillow huggingface_hub psutil "opencv-python>=4.8.1.78" pyyaml sageattention triton || echo "flash-attn/sageattention のビルドに失敗。sdpaモードでフォールバックします"

echo "✅ Setup complete. Launching ComfyUI..."
cd /root/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
