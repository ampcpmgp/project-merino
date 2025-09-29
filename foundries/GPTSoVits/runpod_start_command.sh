bash -c '
set -euo pipefail

export TERM="xterm"
export DEBIAN_FRONTEND="noninteractive"
ARCHIVE_PATH="/workspace/GPT-SoVITS_archive.tar.gz"
INSTALL_DIR="/root/GPT-SoVITS"

apt-get update
apt-get install -y pigz tar

if [ -f "$ARCHIVE_PATH" ]; then
  echo "✅ Archive found at $ARCHIVE_PATH. Extracting..."

  tar -I pigz -xf "$ARCHIVE_PATH" -C /root

  echo "✅ Extraction complete. Starting application..."
else
  echo "🔵 Archive not found. Setting up..."

  apt-get update
  apt-get install -y git wget git-lfs lsof

  cd /root
  git clone --depth 1 https://github.com/RVC-Boss/GPT-SoVITS.git
  cd "$INSTALL_DIR"

  conda create -n GPTSoVits python=3.10 -y
  conda run -n GPTSoVits bash install.sh --device CU128 --source HF --download-uvr5

  git clone --depth 1 https://huggingface.co/Systran/faster-whisper-large-v3 /tmp/faster-whisper-large-v3
  mv /tmp/faster-whisper-large-v3/* tools/asr/models/
  rm -rf /tmp/faster-whisper-large-v3

  echo "✅ Setup complete. Creating archive..."
  echo "🔵 Creating archive for future launches..."
  
  tar -I pigz -cf "$ARCHIVE_PATH" -C /root GPT-SoVITS

  echo "✅ Archive created at $ARCHIVE_PATH."
fi

echo "🔵 Launching application..."
sleep 1

cd "$INSTALL_DIR"
conda run -n GPTSoVits python webui.py --listen 0.0.0.0 &

sleep infinity
'
