#!/usr/bin/env bash

set -euo pipefail

# SillyTavern configuration via environment variables
# refs: https://docs.sillytavern.app/administration/config-yaml/#network-configuration
export SILLYTAVERN_LISTEN=true
export SILLYTAVERN_PORT=8000
export SILLYTAVERN_HEARTBEATINTERVAL=30

# https://docs.sillytavern.app/administration/config-yaml/#security-configuration
export SILLYTAVERN_WHITELISTMODE=false

# https://docs.sillytavern.app/administration/config-yaml/#browser-launch-configuration
export SILLYTAVERN_BROWSERLAUNCH_ENABLED=false

# https://docs.sillytavern.app/administration/config-yaml/#user-authentication
# export SILLYTAVERN_ENABLEUSERACCOUNTS=true

# In a Docker environment, SillyTavern requires either user accounts or securityOverride
# when listening on non-localhost. We override by default since access is expected to be
# protected by Cloudflare Tunnel or nginx Basic Auth.
export SILLYTAVERN_SECURITYOVERRIDE=true

# Optional: enable SillyTavern's built-in basic auth
if [ -n "${SILLYTAVERN_PASSWORD:-}" ]; then
    export SILLYTAVERN_BASICAUTHMODE=true
    export SILLYTAVERN_BASICAUTHUSER_USERNAME="${SILLYTAVERN_USERNAME:-user}"
    export SILLYTAVERN_BASICAUTHUSER_PASSWORD="${SILLYTAVERN_PASSWORD}"
fi

cd /home/appuser/app/SillyTavern

echo "ℹ️ SillyTavern を起動中..."
exec node server.js
