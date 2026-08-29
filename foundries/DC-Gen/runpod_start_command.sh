bash -c '
set -euo pipefail

export TERM="xterm"
export DEBIAN_FRONTEND="noninteractive"
ARCHIVE_PATH="/workspace/DC-Gen_with_env.tar.gz"
INSTALL_DIR="/root/DC-Gen"
CONDA_ENV_NAME="dc_gen"
CONDA_ENV_DIR="/opt/conda/envs/$CONDA_ENV_NAME"

apt-get update
apt-get install -y pigz tar build-essential

if [ -f "$ARCHIVE_PATH" ]; then
  echo "✅ Archive found at $ARCHIVE_PATH. Extracting app and conda environment..."

  tar -I pigz -xvf "$ARCHIVE_PATH" -C /

  echo "✅ Extraction complete. Starting application..."
else
  echo "🔵 Archive not found. Setting up from scratch..."

  apt-get install -y git wget git-lfs lsof
  
  cd /root
  git clone https://github.com/dc-ai-projects/DC-Gen
  cd "$INSTALL_DIR"
  
  conda create -n "$CONDA_ENV_NAME" python=3.10 -y
  conda run -n "$CONDA_ENV_NAME" pip install -U -r requirements.txt
  echo "✅ Setup complete. Creating archive for future launches..."
  tar -I pigz -cf "$ARCHIVE_PATH" -C /root DC-Gen -C /opt/conda/envs "$CONDA_ENV_NAME"

  echo "✅ Archive created at $ARCHIVE_PATH."
fi

echo "🔵 Setup complete. The environment is ready."
# The original repository does not specify a command to run the application.
# You can start an interactive session with:
# cd /root/DC-Gen
# conda run -n dc_gen bash
sleep infinity
'
