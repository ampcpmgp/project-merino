FROM pytorch/pytorch:2.7.0-cuda12.8-cudnn9-devel

# tputエラーを防ぐためにターミナルの種類を設定し、インタラクティブなプロンプトを無効化
ENV TERM=xterm \
  DEBIAN_FRONTEND=noninteractive \
  TEMP=/tmp

RUN apt-get update && apt-get install -y git wget git-lfs dos2unix lsof

WORKDIR /root

RUN git clone https://github.com/RVC-Boss/GPT-SoVITS.git --depth 1

WORKDIR /root/GPT-SoVITS

RUN conda create -n GPTSoVits python=3.10 -y
RUN conda run -n GPTSoVits bash install.sh --device CU128 --source HF --download-uvr5

RUN git clone https://huggingface.co/Systran/faster-whisper-large-v3 /tmp/faster-whisper-large-v3 && \
  mv /tmp/faster-whisper-large-v3/* tools/asr/models/ && \
  rm -rf /tmp/faster-whisper-large-v3

WORKDIR /root
COPY . .

# Convert all .sh files to unix format to avoid CRLF issues
RUN find . -type f -name "*.sh" -exec dos2unix {} \;

WORKDIR /root/GPT-SoVITS

ENTRYPOINT ["/root/entrypoint.sh"]
CMD ["conda", "run", "-n", "GPTSoVits", "python", "webui.py", "--listen", "0.0.0.0"]
