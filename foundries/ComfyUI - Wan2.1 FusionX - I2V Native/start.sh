#!/bin/bash
set -e

echo "install ComfyUI"
cd /workspace
git clone https://github.com/comfyanonymous/ComfyUI.git

echo "install ComfyUI dependencies"
cd /workspace/ComfyUI
pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu128
pip install -r requirements.txt

echo "install ComfyUI custom nodes"
cd custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Manager comfyui-manager
git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git
pip install -r ComfyUI-WanVideoWrapper/requirements.txt
git clone https://github.com/kijai/ComfyUI-KJNodes.git
pip install -r ComfyUI-KJNodes/requirements.txt
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
pip install -r ComfyUI-VideoHelperSuite/requirements.txt

echo "install huggingface-cli and download models"
cd /workspace/ComfyUI
pip install -U "huggingface_hub[cli]"
huggingface-cli download Kijai/WanVideo_comfy umt5-xxl-enc-bf16.safetensors --local-dir models/text_encoders
huggingface-cli download Comfy-Org/Wan_2.1_ComfyUI_repackaged split_files/clip_vision/clip_vision_h.safetensors --local-dir models/clip_vision
huggingface-cli download Kijai/WanVideo_comfy Wan2_1_VAE_bf16.safetensors --local-dir models/vae
huggingface-cli download vrgamedevgirl84/Wan14BT2VFusioniX Wan14Bi2vFusioniX_fp16.safetensors --local-dir models/diffusion_models

echo "start ComfyUI"
python main.py --listen
"