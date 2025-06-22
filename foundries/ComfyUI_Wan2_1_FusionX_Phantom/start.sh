#!/bin/bash
set -e

echo "[Install ComfyUI]"
cd /workspace
git clone https://github.com/comfyanonymous/ComfyUI.git

echo "[Install ComfyUI dependencies]"
cd ComfyUI
pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu128
pip install -r requirements.txt

echo "[Install ComfyUI custom nodes]"
cd custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Manager comfyui-manager
git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git
pip install -r ComfyUI-WanVideoWrapper/requirements.txt
git clone https://github.com/kijai/ComfyUI-KJNodes.git
pip install -r ComfyUI-KJNodes/requirements.txt
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
pip install -r ComfyUI-VideoHelperSuite/requirements.txt

#

#
echo "[Install huggingface-cli and download models]"
cd /workspace/ComfyUI
pip install -U "huggingface_hub[cli]"
cd models
huggingface-cli download Kijai/WanVideo_comfy umt5-xxl-enc-bf16.safetensors --local-dir text_encoders
huggingface-cli download Comfy-Org/Wan_2.1_ComfyUI_repackaged split_files/clip_vision/clip_vision_h.safetensors --local-dir clip_vision
huggingface-cli download Kijai/WanVideo_comfy Wan2_1_VAE_bf16.safetensors --local-dir vae
cd diffusion_models
wget https://civitai.com/models/1651125?modelVersionId=1878555


echo "[Start ComfyUI]"
cd /workspace/ComfyUI
python main.py --listen
