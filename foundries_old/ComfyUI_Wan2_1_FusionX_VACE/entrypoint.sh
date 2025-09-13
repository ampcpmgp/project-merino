#!/bin/bash

echo "[Install huggingface-cli and download models]"
cd /workspace

if [ ! -d "comfyui_models" ]; then
  mkdir -p comfyui_models
fi

cd comfyui_models
pip install -U "huggingface_hub[cli]" hf_transfer

download_if_needed() {
  local REPO_ID="$1"
  local FILE_PATH_IN_REPO="$2"
  local LOCAL_DIR="$3"

  local TARGET_FILE_PATH="$LOCAL_DIR/$FILE_PATH_IN_REPO"

  if [ ! -f "$TARGET_FILE_PATH" ]; then
    echo "Downloading $FILE_PATH_IN_REPO from $REPO_ID to $LOCAL_DIR..."
    huggingface-cli download "$REPO_ID" "$FILE_PATH_IN_REPO" --local-dir "$LOCAL_DIR"
  else
    echo "File $TARGET_FILE_PATH already exists, skipping download."
  fi
}

download_civitai_if_needed() {
  local MODEL_ID="$1"
  local TARGET_FILE_PATH="$2"

  if [ ! -f "$TARGET_FILE_PATH" ]; then
    echo "Downloading model with ID $MODEL_ID from Civitai to $TARGET_FILE_PATH..."
    mkdir -p "$(dirname "$TARGET_FILE_PATH")"
    wget -q -O "$TARGET_FILE_PATH" "https://civitai.com/api/download/models/$MODEL_ID?token=$CIVITAI_API_KEY"
  else
    echo "File $TARGET_FILE_PATH already exists, skipping download."
  fi
}

download_if_needed Kijai/WanVideo_comfy "umt5-xxl-enc-bf16.safetensors" "text_encoders"
download_if_needed Comfy-Org/Wan_2.1_ComfyUI_repackaged "split_files/clip_vision/clip_vision_h.safetensors" "clip_vision"
download_if_needed Kijai/WanVideo_comfy "Wan2_1_VAE_bf16.safetensors" "vae"
download_if_needed Kijai/WanVideo_comfy "Wan2_1-VACE_module_14B_bf16.safetensors" "diffusion_models"

download_civitai_if_needed 1878555 "diffusion_models/Wan14BT2VFusioniX_Phantom.safetensors"

trap 'kill 0' SIGTERM

echo "process background starting..."
cd /ComfyUI
python main.py --listen &
python -m http.server 9000 &

echo "process background started."
wait
