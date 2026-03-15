#!/usr/bin/env bash

set -euo pipefail

mkdir -p /workspace/url-shortcuts
chown appuser:appuser /workspace/url-shortcuts

exec "$@"
