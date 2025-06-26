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
git clone --depth=1 https://$GITHUB_ACCESS_TOKEN@github.com/ltdrdata/ComfyUI-Manager comfyui-manager
git clone --depth=1 https://$GITHUB_ACCESS_TOKEN@github.com/kijai/ComfyUI-WanVideoWrapper.git
pip install -r ComfyUI-WanVideoWrapper/requirements.txt
git clone --depth=1 https://$GITHUB_ACCESS_TOKEN@github.com/kijai/ComfyUI-KJNodes.git
pip install -r ComfyUI-KJNodes/requirements.txt
git clone --depth=1 https://$GITHUB_ACCESS_TOKEN@github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
pip install -r ComfyUI-VideoHelperSuite/requirements.txt
git clone --depth=1 https://$GITHUB_ACCESS_TOKEN@github.com/pythongosssss/ComfyUI-Custom-Scripts.git

echo "[Install huggingface-cli and download models]"
cd /workspace/ComfyUI
pip install -U "huggingface_hub[cli]"
cd models
huggingface-cli download Comfy-Org/Cosmos_Predict2_repackaged cosmos_predict2_2B_video2world_480p_16fps.safetensors --local-dir diffusion_models
huggingface-cli download comfyanonymous/cosmos_1.0_text_encoder_and_VAE_ComfyUI text_encoders/oldt5_xxl_fp8_e4m3fn_scaled.safetensors --local-dir text_encoders
huggingface-cli download Comfy-Org/Wan_2.1_ComfyUI_repackaged split_files/vae/wan_2.1_vae.safetensors --local-dir vae

echo "[Start ComfyUI]"
cd /workspace/ComfyUI
python main.py --listen & python -m http.server 9000
wait
