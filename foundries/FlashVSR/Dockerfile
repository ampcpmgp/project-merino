# FlashVSR RunPod Serverless Worker Dockerfile
# 動画アップスケール用（FlashVSR + ComfyUI CLI）
# ベース: RunPod公式 PyTorch CUDA イメージ

FROM runpod/base:0.4.1-cuda12.4.0

# 環境変数
ENV TERM=xterm \
    DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# システムパッケージ
RUN apt-get update && apt-get install -y \
    git wget git-lfs ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ComfyUI クローン
WORKDIR /app
RUN git clone https://github.com/comfyanonymous/ComfyUI.git --depth 1

# FlashVSR カスタムノード インストール
WORKDIR /app/ComfyUI/custom_nodes
RUN git clone https://github.com/1038lab/ComfyUI-FlashVSR.git --depth 1

# FlashVSR モデル ダウンロード
WORKDIR /app/ComfyUI/models
RUN mkdir -p FlashVSR && \
    cd FlashVSR && \
    wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Wan2_1-T2V-1_3B_FlashVSR_fp32.safetensors && \
    wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Wan2_1_FlashVSR_TCDecoder_fp32.safetensors && \
    wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Wan2_1_FlashVSR_LQ_proj_model_bf16.safetensors && \
    wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Wan2.1_VAE.safetensors && \
    wget -q https://huggingface.co/1038lab/FlashVSR/resolve/main/Prompt.safetensors

# Python依存関係
WORKDIR /app/ComfyUI
RUN pip install --no-cache-dir -r requirements.txt

# FlashVSR追加依存
RUN pip install --no-cache-dir \
    einops \
    safetensors \
    imageio \
    imageio-ffmpeg

# handler.py コピー
COPY handler.py /app/handler.py
COPY rp_handler.py /app/rp_handler.py

WORKDIR /app

# RunPod Serverless エントリポイント
CMD ["python", "-u", "/app/rp_handler.py"]
