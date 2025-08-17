#!/bin/bash

set -e

cloudflared tunnel run --token @@@CLOUD_FLARED_TUNNEL_TOKEN@@@ &

cd /docker
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d
