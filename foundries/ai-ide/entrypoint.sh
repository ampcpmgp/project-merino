#!/usr/bin/env bash

set -euo pipefail

mkdir -p /workspace/url-shortcuts
chown appuser:appuser /workspace/url-shortcuts

if [ -z "${CODE_SERVER_PASSWORD:-}" ]; then
    echo "ERROR: CODE_SERVER_PASSWORD is not set" >&2
    exit 1
fi
echo "user:$(openssl passwd -apr1 "$CODE_SERVER_PASSWORD")" > /etc/nginx/htpasswd

exec "$@"
