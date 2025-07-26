FROM nvidia/cuda:12.8.1-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

# aptのキャッシュを利用して高速化
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  apt-get update && \
  apt-get install -y --no-install-recommends \
  cmake \
  build-essential \
  ca-certificates \
  openssh-server \
  git \
  curl \
  supervisor

# sshdの特権分離用のディレクトリを作成
RUN mkdir /run/sshd

# Condaのキャッシュを利用して高速化
# Miniconda - https://www.anaconda.com/docs/getting-started/miniconda/install#linux-terminal-installer
RUN --mount=type=cache,target=/opt/conda/pkgs,sharing=locked \
  curl -s -L https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -o /tmp/miniconda.sh && \
  bash /tmp/miniconda.sh -b -u -p /opt/conda && \
  rm /tmp/miniconda.sh

ENV PATH=/opt/conda/bin:$PATH

# ユーザーを作成し、作業ディレクトリのオーナーを変更
RUN useradd -m -s /bin/bash appuser && \
  mkdir -p /opt/ComfyUI && \
  chown -R appuser:appuser /opt/ComfyUI

# appuserに切り替える。以降のコマンドはappuserで実行される
USER appuser

# VSCode Server - https://coder.com/docs/install
RUN curl -fsSL https://code-server.dev/install.sh | sh

# ComfyUI本体をクローン
# このレイヤーはリポジトリが更新されると再実行される
RUN --mount=type=cache,target=/home/appuser/.cache,sharing=locked \
  git clone --depth=1 https://github.com/comfyanonymous/ComfyUI.git

WORKDIR /opt/ComfyUI

# 依存関係のインストールをレイヤーに分ける
# Conda環境作成とPyTorchのインストール (変更頻度が低い)
RUN --mount=type=cache,target=/home/appuser/.cache,sharing=locked \
  conda create -n mofugao python=3.12 -y && \
  conda run -n mofugao pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu128 && \
  conda run -n mofugao pip install -U "huggingface_hub[cli]" hf_transfer

# ComfyUIの要求パッケージをインストール (次に変更頻度が低い)
RUN --mount=type=cache,target=/home/appuser/.cache,sharing=locked \
  conda run -n mofugao pip install -r requirements.txt

# custom_nodesをクローンして依存関係をインストール
WORKDIR /opt/ComfyUI/custom_nodes
RUN --mount=type=cache,target=/home/appuser/.cache,sharing=locked \
  git clone --depth=1 https://github.com/ltdrdata/ComfyUI-Manager.git comfyui-manager && \
  git clone --depth=1 https://github.com/kijai/ComfyUI-WanVideoWrapper.git && \
  conda run -n mofugao pip install -r ComfyUI-WanVideoWrapper/requirements.txt && \
  git clone --depth=1 https://github.com/kijai/ComfyUI-KJNodes.git && \
  conda run -n mofugao pip install -r ComfyUI-KJNodes/requirements.txt && \
  git clone --depth=1 https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git && \
  conda run -n mofugao pip install -r ComfyUI-VideoHelperSuite/requirements.txt && \
  git clone --depth=1 https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git && \
  git clone --depth=1 https://github.com/Fannovel16/comfyui_controlnet_aux.git && \
  conda run -n mofugao pip install -r comfyui_controlnet_aux/requirements.txt

# root権限が必要な処理のためにrootに戻る
USER root

WORKDIR /opt
COPY extra_model_paths.yaml ComfyUI/
# このファイルはappuserが読み取れるようにオーナーを戻す
RUN chown appuser:appuser ComfyUI/extra_model_paths.yaml

COPY scripts/ /usr/local/bin/
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/*.sh
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 22 8100 8200
WORKDIR /opt/ComfyUI
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
