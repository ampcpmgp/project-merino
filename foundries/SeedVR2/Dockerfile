# SeedVR2 RunPod Serverless / Community Cloud Worker Dockerfile (仮)
# ByteDance-Seed/SeedVR2 (ICLR2026) — one-step diffusion video restoration/upscaling
# 2K/2160p 高品質 upscale 用。FlashVSR の約2倍のMP単価だが品質・2160p直接指定が強い。
#
# ★ これは「仮」Dockerfile。コミュニティクラウドで最速チューニングするための中間版。
# ★ SeedVR2 公式は torchrun ベース推論 (projects/inference_seedvr2_3b.py)。
#   H100-80G 1枚で 100x720x1280、4枚で 1080p/2K。GPU要件が重い点に注意。
#
# ★ 依存が重い (flash_attn / apex)。まずビルドが通るかを確認する段階。
#
# ベース: pytorch/pytorch 2.4.0 + cuda12.1 (公式 apex whl が torch=2.4.0,cuda12.1,cp310 前提)
# ※ python を 3.10 に固定する。ベースイメージのpythonと整合させる。

FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-devel

# 環境変数
ENV TERM=xterm \
    DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/SeedVR:/app

# システムパッケージ
RUN apt-get update && apt-get install -y \
    git wget git-lfs ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# RunPod Serverless SDK
RUN pip install --no-cache-dir runpod

# SeedVR リポジトリ clone (SeedVR2 + SeedVR 両方入り)
WORKDIR /app
RUN git clone https://github.com/ByteDance-Seed/SeedVR.git

# Python 依存 (requirements.txt)
WORKDIR /app/SeedVR
RUN pip install --no-cache-dir -r requirements.txt || echo "requirements.txt warnings ignored"

# flash_attn: 公式 2.5.9.post1。ビルド失敗時はフォールバック。
RUN pip install flash_attn==2.5.9.post1 --no-build-isolation || echo "flash_attn build failed"

# apex: 公式提供 whl (cp310 / torch 2.4.0 / cuda12.1)。python/torch整合を要確認。
RUN pip install https://huggingface.co/ByteDance-Seed/SeedVR2-3B/resolve/main/apex-0.1-cp310-cp310-linux_x86_64.whl || echo "apex whl failed"

# モデルダウンロード — 量子化版を優先 (VRAM節約・速度向上)
# SeedVR2 は fp16 / fp8_e4m3fn / int8_convrot / NVFP4 / MXFP8 量子化がある。
# RTX 4090(24GB) で 2160px を安全に処理するため、3B の FP8 と INT8 を両方DL。
# モデルは ComfyUI 公式リポジトリ (Comfy-Org/SeedVR2) から。VAE は共通。
# ※ サイズ節約のため fp16 は省略 (FP8/INT8 で十分)。
RUN mkdir -p /models/seedvr2 /models/seedvr2_vae && \
    echo "Downloading SeedVR2 3B FP8..." && \
    wget -q https://huggingface.co/Comfy-Org/SeedVR2/resolve/main/diffusion_models/seedvr2_3b_fp8_e4m3fn.safetensors -O /models/seedvr2/seedvr2_3b_fp8_e4m3fn.safetensors && \
    echo "Downloading SeedVR2 3B INT8..." && \
    wget -q https://huggingface.co/Comfy-Org/SeedVR2/resolve/main/diffusion_models/seedvr2_3b_int8_convrot.safetensors -O /models/seedvr2/seedvr2_3b_int8_convrot.safetensors && \
    echo "Downloading SeedVR2 VAE..." && \
    wget -q https://huggingface.co/Comfy-Org/SeedVR2/resolve/main/vae/seedvr2_ema_vae_fp16.safetensors -O /models/seedvr2_vae/seedvr2_ema_vae_fp16.safetensors && \
    echo "SeedVR2 models downloaded." || echo "model download failed (will retry at runtime)"

# 色補正 color_fix を公式位置へ (あれば)
RUN mkdir -p projects/video_diffusion_sr && (cp color_fix.py projects/video_diffusion_sr/color_fix.py 2>/dev/null || echo "color_fix.py not in repo root")

# handler 類コピー
COPY rp_handler.py /app/rp_handler.py
COPY handler.py /app/handler.py

WORKDIR /app

# RunPod Serverless エントリポイント (community cloud時は手動コマンドで起動)
CMD ["python", "-u", "/app/rp_handler.py"]
