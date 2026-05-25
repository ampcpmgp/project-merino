#!/usr/bin/env bash

set -euo pipefail

mkdir -p /workspace/url-shortcuts
chown appuser:appuser /workspace/url-shortcuts

# Ensure SillyTavern data directory exists
mkdir -p "${SILLYTAVERN_DATAROOT}"

# Ensure NGINX basic auth credentials are set
if [ -z "${NGINX_BASIC_PASSWORD:-}" ]; then
    echo "ERROR: NGINX_BASIC_PASSWORD is not set" >&2
    exit 1
fi
echo "user:$(openssl passwd -apr1 "$NGINX_BASIC_PASSWORD")" > /etc/nginx/htpasswd

# Ensure supervisor configuration directory exists
mkdir -p /workspace/supervisor-conf.d/
chown -R appuser:appuser /workspace/supervisor-conf.d/ || true

gosu appuser /home/appuser/app/scripts-user/setup-hermes.sh

echo "nameserver 8.8.8.8" >> /etc/resolv.conf

exec "$@"
