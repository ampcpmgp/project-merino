bash -c '
set -euo pipefail

export TERM="xterm"
export DEBIAN_FRONTEND="noninteractive"
ARCHIVE_PATH="/workspace/LongLive_with_env.tar.gz"
INSTALL_DIR="/root/LongLive"
CONDA_ENV_NAME="longlive"
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
  git clone https://github.com/NVlabs/LongLive
  cd "$INSTALL_DIR"
  
  conda create -n "$CONDA_ENV_NAME" python=3.10 -y
  conda activate "$CONDA_ENV_NAME"
  
  conda install nvidia/label/cuda-12.4.1::cuda -y
  conda install -c nvidia/label/cuda-12.4.1 cudatoolkit -y
  pip install torch==2.5.0 torchvision==0.20.0 torchaudio==2.5.0 --index-url https://download.pytorch.org/whl/cu124
  pip install -r requirements.txt
  pip install flash-attn==2.7.4.post1 --no-build-isolation
  
  huggingface-cli download Wan-AI/Wan2.1-T2V-1.3B --local-dir wan_models/Wan2.1-T2V-1.3B
  huggingface-cli download Efficient-Large-Model/LongLive --local-dir longlive_models

  echo "✅ Setup complete. Creating archive for future launches..."
  
  tar -I pigz -cf "$ARCHIVE_PATH" -C /root LongLive -C /opt/conda/envs "$CONDA_ENV_NAME"

  echo "✅ Archive created at $ARCHIVE_PATH."
fi

echo "🔵 Launching application..."
sleep 1

cd "$INSTALL_DIR"
conda run -n "$CONDA_ENV_NAME" bash interactive_inference.sh &

sleep infinity
'
