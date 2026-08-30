# FlashVSR RunPod Community Worker Dockerfile
# 動画アップスケール用（FlashVSR + ComfyUI CLI）
# 環境変数駆動・単発ワーカー（community_worker.py）
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

# R2一時認証情報（S3 SigV4 + session token）用の boto3
RUN pip install --no-cache-dir boto3

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
COPY community_worker.py /app/community_worker.py

WORKDIR /app

# 環境変数駆動ワーカー（ジョブは環境変数で完全指定・1ジョブ処理して終了）
# 起動例:
#   docker run --gpus all -e JOB_ID=xxx -e INPUT_URL=https://... \
#     -e R2_ENDPOINT=... -e R2_BUCKET=... -e R2_ACCESS_KEY=... \
#     -e R2_SECRET_KEY=... -e R2_SESSION_TOKEN=... ofuton/flashvsr:0.0.7
#   ※ SCALE 省略時は入力幅に応じて自動決定（方式C: <540→4x, 540-1080→4x, >1080→2x）
CMD ["python", "-u", "/app/community_worker.py"]
