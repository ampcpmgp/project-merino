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

download_if_needed comfyanonymous/cosmos_1.0_text_encoder_and_VAE_ComfyUI text_encoders/oldt5_xxl_fp8_e4m3fn_scaled.safetensors text_encoders
download_if_needed Comfy-Org/Wan_2.1_ComfyUI_repackaged split_files/vae/wan_2.1_vae.safetensors vae
download_if_needed Comfy-Org/Cosmos_Predict2_repackaged cosmos_predict2_2B_video2world_480p_16fps.safetensors diffusion_models

trap 'kill 0' SIGTERM

echo "process background starting..."
cd /ComfyUI
python main.py --listen &
python -m http.server 9000 &

echo "process background started."
wait
