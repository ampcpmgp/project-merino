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

echo "[Start ComfyUI]"
cd /workspace/ComfyUI
python main.py --listen & python -m http.server 8000
wait
