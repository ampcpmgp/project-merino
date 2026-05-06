#!/usr/bin/env bash

set -euo pipefail

mkdir -p /workspace/url-shortcuts
chown appuser:appuser /workspace/url-shortcuts

# Ensure SillyTavern data directory exists
mkdir -p "${SILLYTAVERN_DATAROOT}"

if [ -z "${NGINX_BASIC_PASSWORD:-}" ]; then
    echo "ERROR: NGINX_BASIC_PASSWORD is not set" >&2
    exit 1
fi
echo "user:$(openssl passwd -apr1 "$NGINX_BASIC_PASSWORD")" > /etc/nginx/htpasswd

exec "$@"
