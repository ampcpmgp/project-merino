#!/usr/bin/env bash

set -euo pipefail

mkdir -p /workspace/url-shortcuts
chown appuser:appuser /workspace/url-shortcuts

# Ensure SillyTavern data directory exists and is writable by appuser
if [ ! -d "${SILLYTAVERN_DATAROOT}" ]; then
    mkdir -p "$(dirname "${SILLYTAVERN_DATAROOT}")"
    sudo -u appuser mkdir -p "${SILLYTAVERN_DATAROOT}"
fi

if ! sudo -u appuser test -w "${SILLYTAVERN_DATAROOT}"; then
    echo "WARNING: ${SILLYTAVERN_DATAROOT} is not writable by appuser. Check WSL/drvfs mount options." >&2
fi

if [ -z "${NGINX_BASIC_PASSWORD:-}" ]; then
    echo "ERROR: NGINX_BASIC_PASSWORD is not set" >&2
    exit 1
fi
echo "user:$(openssl passwd -apr1 "$NGINX_BASIC_PASSWORD")" > /etc/nginx/htpasswd

exec "$@"
