
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
    && rm -rf /var/lib/apt/lists/*

# Install cloudflared
RUN mkdir -p --mode=0755 /usr/share/keyrings \
    && curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null \
    && echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list \
    && apt-get update && apt-get install -y cloudflared \
    && rm -rf /var/lib/apt/lists/*

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
    n8n@1.109.2 \
    @anthropic-ai/claude-code@1.0.108 \
    ccusage@16.2.3 \
    yarn@1.22.22 \
    opencode-ai@0.6.5 \
    @charmland/crush@0.7.6 \
    minimist@1.2.8 \
    chai@6.0.1

# Set up working directory
WORKDIR /home/appuser/app
COPY . .

# Convert all .sh files to unix format to avoid CRLF issues
RUN find . -type f -name "*.sh" -exec dos2unix {} \;

# Expose n8n port
EXPOSE 8100

# Set entrypoint
ENTRYPOINT ["/home/appuser/app/entrypoint.sh"]
