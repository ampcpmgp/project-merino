# =============================================================
# Stage 1: "builder" - ソースコードの取得に特化したステージ
# =============================================================
FROM runpod/pytorch:2.8.0-py3.11-cuda12.8.1-cudnn-devel-ubuntu22.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends git && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /
RUN git clone --depth=1 https://github.com/comfyanonymous/ComfyUI.git

WORKDIR /ComfyUI/custom_nodes
RUN git clone --depth=1 https://github.com/ltdrdata/ComfyUI-Manager.git comfyui-manager
RUN git clone --depth=1 https://github.com/kijai/ComfyUI-WanVideoWrapper.git
RUN git clone --depth=1 https://github.com/kijai/ComfyUI-KJNodes.git
RUN git clone --depth=1 https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
RUN git clone --depth=1 https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git


# =============================================================
# Stage 2: "runtime" - 最終的な実行環境ステージ
# =============================================================
FROM runpod/pytorch:2.8.0-py3.11-cuda12.8.1-cudnn-devel-ubuntu22.04

COPY --from=builder /ComfyUI /ComfyUI

WORKDIR /ComfyUI
RUN pip install -r requirements.txt
# https://github.com/thu-ml/SageAttention
RUN pip install sageattention==1.0.6

WORKDIR /ComfyUI/custom_nodes
RUN pip install -r ComfyUI-WanVideoWrapper/requirements.txt
RUN pip install -r ComfyUI-KJNodes/requirements.txt
RUN pip install -r ComfyUI-VideoHelperSuite/requirements.txt

WORKDIR /ComfyUI

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
CMD ["entrypoint.sh"]
