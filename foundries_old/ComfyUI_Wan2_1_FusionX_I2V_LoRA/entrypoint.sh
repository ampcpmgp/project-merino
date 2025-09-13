#!/bin/bash

echo "[Install huggingface-cli and download models]"
cd /workspace
pip install -U "huggingface_hub[cli]"

download_if_needed() {
  local REPO_ID="$1"
  local FILE_PATH_IN_REPO="$2"
  local LOCAL_DIR="$3"

  local TARGET_FILE_PATH="$LOCAL_DIR/$FILE_PATH_IN_REPO"

  if [ ! -f "$TARGET_FILE_PATH" ]; then
    huggingface-cli download "$REPO_ID" "$FILE_PATH_IN_REPO" --local-dir "$LOCAL_DIR"
  else
    echo "File $TARGET_FILE_PATH already exists, skipping download."
  fi
}

download_if_needed Kijai/WanVideo_comfy "Wan21_CausVid_14B_T2V_lora_rank32_v2.safetensors" "comfyui_models/loras"
download_if_needed alibaba-pai/Wan2.1-Fun-Reward-LoRAs "Wan2.1-Fun-14B-InP-MPS.safetensors" "comfyui_models/loras"
download_if_needed Kijai/WanVideo_comfy "Wan21_AccVid_I2V_480P_14B_lora_rank32_fp16.safetensors" "comfyui_models/loras"
download_if_needed vrgamedevgirl84/Wan14BT2VFusioniX "OtherLoRa's/Wan14B_RealismBoost.safetensors" "comfyui_models/loras"
download_if_needed vrgamedevgirl84/Wan14BT2VFusioniX "OtherLoRa's/DetailEnhancerV1.safetensors" "comfyui_models/loras"
download_if_needed Comfy-Org/Wan_2.1_ComfyUI_repackaged "split_files/clip_vision/clip_vision_h.safetensors" "comfyui_models/clip_vision"
download_if_needed Kijai/WanVideo_comfy "Wan2_1_VAE_bf16.safetensors" "comfyui_models/vae"
download_if_needed Kijai/WanVideo_comfy "umt5-xxl-enc-bf16.safetensors" "comfyui_models/text_encoders"
download_if_needed Kijai/WanVideo_comfy "Wan2_1-I2V-14B-720P_fp8_e5m2.safetensors" "comfyui_models/diffusion_models"

trap 'kill 0' SIGTERM

echo "process background starting..."
cd /ComfyUI
python main.py --listen &
python -m http.server 9000 &

echo "process background started."
wait
