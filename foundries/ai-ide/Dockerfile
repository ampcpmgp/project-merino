
# Base image
FROM ubuntu:24.04

# Set non-interactive frontend
ARG DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    curl \
    unzip \
    jq \
    tree \
    ca-certificates \
    git \
    sudo \
    vim \
    pkg-config \
    lsof \
    pigz \
    dos2unix \
    gosu \
    netcat-openbsd \
    gnupg \
    ripgrep \
    ffmpeg \
    supervisor \
    nginx-extras \
    graphicsmagick \
    rsync \
    pv \
    ### Chromeの動作に必要なLinux共有ライブラリをインストール ここから ###
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    libxshmfence1 \
    libglu1-mesa \
    fonts-ipafont-gothic \
    fonts-freefont-ttf \
    fonts-noto-color-emoji \
    fontconfig \
    libnginx-mod-http-lua \
    sqlite3 \
    cron \
    gh \
    texlive-binaries \
    pandoc \
    ### Chrome の動作に必要なLinux共有ライブラリをインストール ここまで ###
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# フォントキャッシュを更新（念のため追加）
RUN fc-cache -fv

# code-serverのインストール
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Install cloudflared
RUN mkdir -p --mode=0755 /usr/share/keyrings \
    && curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null \
    && echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list \
    && apt-get update && apt-get install -y cloudflared \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws

# Create a non-root user
RUN useradd -m -s /bin/bash appuser && \
    echo "appuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER appuser

ENV PATH="/home/appuser/.local/bin:$PATH"

RUN curl -fsSL https://fnm.vercel.app/install | bash
ENV PATH="/home/appuser/.local/share/fnm:$PATH"

RUN fnm install v24 && fnm default v24
ENV PATH="/home/appuser/.local/share/fnm/aliases/default/bin:$PATH"

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/home/appuser/.bun/bin:$PATH"

RUN npm install -g pnpm
ENV PATH="/home/appuser/.local/share/pnpm/bin:$PATH"

# n8n は pnpm/bun に公式対応していない
# https://docs.n8n.io/hosting/installation/npm/
RUN npm install -g \
    n8n@2.19.5 \
    @fal-ai/client@1.9.5 \
    minimist@1.2.8 \
    chai@6.2.2 \
    cross-fetch@4.1.0 \
    js-yaml@4.1.1 \
    jsonrepair@3.14.0

# CLI ツール類は pnpm で（n8n から require 不要）
RUN pnpm add -g \
    @anthropic-ai/claude-code@2.1.107 \
    ccusage@18.0.10 \
    opencode-ai@1.4.3

# Clean up build caches before installing Chrome (keep image size down)
# Note: DO NOT move this after Chrome install, it will wipe puppeteer's browser binary
RUN rm -rf /home/appuser/.cache/bun /home/appuser/.cache/node /home/appuser/.cache/pnpm

# chrome は n8n-puppeteer-node のバージョンに合わせる
RUN pnpm add -g puppeteer@24.36.0
RUN pnpm dlx puppeteer browsers install chrome@143.0.7499.192
ENV PUPPETEER_CACHE_DIR="/home/appuser/.cache/puppeteer"

# Install Hermes Agent
RUN curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash -s -- --skip-setup
ENV PATH="/home/appuser/.hermes/hermes-agent/venv/bin:$PATH"
ENV HERMES_BACKUP_PATH=/workspace/hermes_backup/hermes.tar.gz

# Install GBrain
RUN git clone --depth 1 https://github.com/garrytan/gbrain.git /home/appuser/app/gbrain \
    && cd /home/appuser/app/gbrain \
    && bun install \
    && bun link
ENV GBRAIN_BACKUP_PATH=/workspace/gbrain_backup/gbrain.tar.gz
ENV BRAIN_BACKUP_PATH=/workspace/brain_backup/brain.tar.gz

# Install SillyTavern
RUN git clone --depth 1 -b 1.18.0 https://github.com/SillyTavern/SillyTavern.git /home/appuser/app/SillyTavern \
    && cd /home/appuser/app/SillyTavern \
    && npm install

# Create code-server config directory and copy settings as root
# The settings.json file should be placed in a 'config' directory next to the Dockerfile
USER root
RUN mkdir -p /home/appuser/.local/share/code-server/User && \
    chown -R appuser:appuser /home/appuser/.local/share/code-server
COPY --chown=appuser:appuser config/settings.json /home/appuser/.local/share/code-server/User/settings.json

WORKDIR /home/appuser/app
COPY . .

# build whiteboard
WORKDIR /home/appuser/app/whiteboard
RUN bun install
RUN bun run build:client

# Clean up cache
WORKDIR /home/appuser/app
# Fix whiteboard permissions for runtime user (appuser)
RUN chown -R appuser:appuser /home/appuser/app/whiteboard

# Fix home directory permissions so nginx (www-data) can read whiteboard static files
RUN chmod 755 /home/appuser

# Set up root user
USER root
RUN mkdir -p /workspace/public /workspace/private && \
    chown -R appuser:appuser /workspace
COPY config/supervisord.conf /etc/supervisor/supervisord.conf
COPY config/nginx.conf /etc/nginx/sites-available/default

# Convert all .sh files to unix format to avoid CRLF issues
RUN find . -type f -name "*.sh" -exec dos2unix {} \;
RUN find . -type f -name "*.sh" -exec chmod +x {} \;

# Set entrypoint
ENTRYPOINT ["/home/appuser/app/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
