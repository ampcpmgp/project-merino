FROM ubuntu:24.04

# 環境変数設定
ENV DEBIAN_FRONTEND=noninteractive

# 必要なパッケージのインストール (supervisor, nginx, etc.)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    supervisor \
    nginx \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# code-serverのインストール
RUN curl -fsSL https://code-server.dev/install.sh | sh -s -- --dry-run

# 設定ファイルをコンテナ内にコピー
COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY config/nginx.conf /etc/nginx/sites-available/default

# 必要なディレクトリを作成し、パーミッションを設定
# /workspace ディレクトリは docker run 時にボリュームマウントされることを想定
RUN mkdir -p /workspace/public \
    /var/log/supervisor \
    /var/run/code-server \
    && chown -R root:root /var/run/code-server

# Nginx と code-server のポートを開放
EXPOSE 80 8080

# supervisorを起動するコマンド
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
