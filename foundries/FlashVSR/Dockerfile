# FlashVSR RunPod Serverless Worker Dockerfile
# 動画アップスケール用（FlashVSR + ComfyUI CLI）
# ベース: PyTorch公式 CUDA 12.8 イメージ（GPTSoVits foundry と同じ実績のあるベース）

FROM pytorch/pytorch:2.7.0-cuda12.8-cudnn9-devel

# 環境変数
ENV TERM=xterm \
    DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# システムパッケージ
RUN apt-get update && apt-get install -y \
    git wget git-lfs ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# RunPod Serverless SDK
RUN pip install --no-cache-dir runpod

# ComfyUI クローン
WORKDIR /app
RUN git clone https://github.com/comfyanonymous/ComfyUI.git --depth 1

# FlashVSR カスタムノード インストール
# CLI (cli_main.py) を含む naxci1/ComfyUI-FlashVSR_Stable を使用
WORKDIR /app/ComfyUI/custom_nodes
RUN git clone https://github.com/naxci1/ComfyUI-FlashVSR_Stable.git --depth 1

# FlashVSR モデル ダウンロード（naxci1版が期待するファイル名）
# 出典: https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1
# nodes.py は base_dir/FlashVSR-v1.1/ 配下にモデルを期待する（model_path = base_dir + model）
WORKDIR /app/ComfyUI/models
RUN mkdir -p FlashVSR-v1.1 && \
    cd FlashVSR-v1.1 && \
    wget -q https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1/resolve/main/LQ_proj_in.ckpt && \
    wget -q https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1/resolve/main/TCDecoder.ckpt && \
    wget -q https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1/resolve/main/diffusion_pytorch_model_streaming_dmd.safetensors && \
    wget -q https://huggingface.co/lightx2v/Autoencoders/resolve/main/Wan2.1_VAE.pth

# Python依存関係
WORKDIR /app/ComfyUI
RUN pip install --no-cache-dir -r requirements.txt

# FlashVSR追加依存（naxci1版 requirements.txt）
# ※ sageattention は sparse_sage_attention モードに必須（triton ベース・pip で導入可）
#    flash-attn はCUDAビルドが必要で重いため、ビルド失敗時は
#    --attention_mode sdpa にフォールバック可能（wan_video_dit.py は try/except で対応）
WORKDIR /app/ComfyUI/custom_nodes/ComfyUI-FlashVSR_Stable
RUN pip install --no-cache-dir \
    einops \
    safetensors \
    tqdm \
    pillow \
    huggingface_hub \
    psutil \
    "opencv-python>=4.8.1.78" \
    pyyaml \
    triton \
    sageattention \
    || echo "sageattention のインストールに失敗。sdpaモードでフォールバックします"

# handler.py コピー
COPY handler.py /app/handler.py
COPY rp_handler.py /app/rp_handler.py

WORKDIR /app

# RunPod Serverless エントリポイント
CMD ["python", "-u", "/app/rp_handler.py"]
