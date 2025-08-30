{ pkgs, ... }:

{
  packages = with pkgs; [
    # From install_apt_dependencies.sh
    build-essential
    python3
    cloudflared
    curl
    unzip
    jq
    tree
    cacert
    git
    sudo
    vim
    pkg-config
    lsof
    pigz
    awscli2

    # From install_bun_dependencies.sh
    bun
    nodejs_22
  ];

  enterShell = ''
    # From install_bun_dependencies.sh
    bun add -g \\
      n8n@1.107.4 \\
      @anthropic-ai/claude-code@1.0.90 \\
      ccusage@16.2.0 \\
      yarn@1.22.22 \\
      opencode-ai@0.5.18 \\
      @charmland/crush@0.7.1 \\
      minimist@1.2.8 \\
      chai@6.0.1

    # From run_n8n.sh
    export $(grep -v \'^\\s*#\' .env | grep -v \'^$\' | xargs)
    export CUSTOM_N8N_TAR_FILE="n8n.tar.gz"
    export CUSTOM_N8N_TAR_FILE_PATH="$HOME/$CUSTOM_N8N_TAR_FILE"
    if aws s3api head-object --region "$AWS_DEFAULT_REGION" --endpoint-url "$AWS_ENDPOINT_URL" --bucket "$AWS_BUCKET_NAME" --key "$CUSTOM_N8N_TAR_FILE" > /dev/null 2>&1; then
      echo "ℹ️ Found s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE. Downloading and extracting."
      aws s3 cp --region "$AWS_DEFAULT_REGION" --endpoint-url "$AWS_ENDPOINT_URL" "s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE" "$CUSTOM_N8N_TAR_FILE_PATH"
      tar --use-compress-program="pigz" -xf "$CUSTOM_N8N_TAR_FILE_PATH" -C "$HOME"
      echo "✅ Extraction complete."
    else
      echo "ℹ️ s3://$AWS_BUCKET_NAME/$CUSTOM_N8N_TAR_FILE not found. Skipping."
    fi
  '';

  languages.nix.enable = true;

  processes.n8n = {
    exec = "n8n start";
    env = {
      N8N_USER_FOLDER = "$HOME/n8n_data";
      N8N_RUNNERS_ENABLED = "true";
      N8N_PORT = "8100";
      N8N_EDITOR_BASE_URL = "\${N8N_URL}";
      WEBHOOK_URL = "\${N8N_URL}";
      N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = "true";
      NODE_FUNCTION_ALLOW_BUILTIN = "*";
      NODE_FUNCTION_ALLOW_EXTERNAL = "minimist,chai";
      GENERIC_TIMEZONE = "Asia/Tokyo";
    };
  };

  processes.cloudflared = {
    exec = "cloudflared tunnel run --token \${CLOUDFLARED_TOKEN}";
  };

  # Reads .env file
  dotenv.enable = true;
}
