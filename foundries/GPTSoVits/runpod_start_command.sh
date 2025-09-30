bash -c '
set -euo pipefail

export TERM="xterm"
export DEBIAN_FRONTEND="noninteractive"
ARCHIVE_PATH="/workspace/GPT-SoVITS_with_env.tar.gz"
INSTALL_DIR="/root/GPT-SoVITS"
CONDA_ENV_NAME="GPTSoVits"
CONDA_ENV_DIR="/opt/conda/envs/$CONDA_ENV_NAME"

apt-get update
apt-get install -y pigz tar

if [ -f "$ARCHIVE_PATH" ]; then
  echo "✅ Archive found at $ARCHIVE_PATH. Extracting app and conda environment..."

  tar -I pigz -xvf "$ARCHIVE_PATH" -C /

  echo "✅ Extraction complete. Starting application..."
else
  echo "🔵 Archive not found. Setting up from scratch..."

  apt-get install -y git wget git-lfs lsof

  cd /root
  git clone --depth 1 https://github.com/RVC-Boss/GPT-SoVITS.git
  cd "$INSTALL_DIR"

  conda create -n "$CONDA_ENV_NAME" python=3.10 -y
  conda run -n "$CONDA_ENV_NAME" bash install.sh --device CU128 --source HF --download-uvr5

  git clone --depth 1 https://huggingface.co/Systran/faster-whisper-large-v3 /tmp/faster-whisper-large-v3
  mv /tmp/faster-whisper-large-v3/* tools/asr/models/
  rm -rf /tmp/faster-whisper-large-v3

  echo "✅ Setup complete. Creating archive for future launches..."
  
  tar -I pigz -cf "$ARCHIVE_PATH" -C /root GPT-SoVITS -C /opt/conda/envs "$CONDA_ENV_NAME"

  echo "✅ Archive created at $ARCHIVE_PATH."
fi

echo "🔵 Launching application..."
sleep 1

cd "$INSTALL_DIR"
conda run -n "$CONDA_ENV_NAME" python webui.py --listen 0.0.0.0 &

sleep infinity
'
