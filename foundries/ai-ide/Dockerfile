
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
    supervisor \
    nginx-extras \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

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

# Install bun, fnm, and node packages as appuser
USER appuser
RUN bash -c "curl -fsSL https://fnm.vercel.app/install | bash"
ENV PATH="/home/appuser/.local/share/fnm:$PATH"

RUN bash -c '. /home/appuser/.bashrc && \
    fnm install v24 && fnm default v24 && \
    curl -fsSL https://bun.sh/install | bash'

ENV BUN_INSTALL="/home/appuser/.bun"
ENV PATH="$BUN_INSTALL/bin:/home/appuser/.local/share/fnm/aliases/default/bin:$PATH"

RUN bun add -g \
    n8n@1.119.2 \
    @anthropic-ai/claude-code@2.0.42 \
    ccusage@17.1.5 \
    opencode-ai@1.0.65 \
    minimist@1.2.8 \
    chai@6.2.1 \
    cross-fetch@4.1.0 \
    @fal-ai/client@1.7.2

# Create code-server config directory and copy settings as root
# The settings.json file should be placed in a 'config' directory next to the Dockerfile
RUN mkdir -p /home/appuser/.local/share/code-server/User
COPY config/settings.json /home/appuser/.local/share/code-server/User/settings.json

WORKDIR /home/appuser/app
COPY . .

# Set up root user
USER root
RUN mkdir -p /workspace/public && \
    chown -R appuser:appuser /workspace
COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY config/nginx.conf /etc/nginx/sites-available/default

# Convert all .sh files to unix format to avoid CRLF issues
RUN find . -type f -name "*.sh" -exec dos2unix {} \;

# Set entrypoint
ENTRYPOINT ["/home/appuser/app/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
