#!/usr/bin/env bash

set -euo pipefail

# SillyTavern configuration via environment variables
# refs: https://docs.sillytavern.app/administration/config-yaml/#network-configuration
export SILLYTAVERN_LISTEN=true
export SILLYTAVERN_PORT=8000
export SILLYTAVERN_HEARTBEATINTERVAL=30

# https://docs.sillytavern.app/administration/config-yaml/#security-configuration
export SILLYTAVERN_WHITELISTMODE=false

# https://docs.sillytavern.app/administration/config-yaml/#private-address-whitelisting
export SILLYTAVERN_PRIVATEADDRESSWHITELIST_ENABLED=true

# https://docs.sillytavern.app/administration/config-yaml/#browser-launch-configuration
export SILLYTAVERN_BROWSERLAUNCH_ENABLED=false

# https://docs.sillytavern.app/administration/config-yaml/#user-authentication
export SILLYTAVERN_ENABLEUSERACCOUNTS=true

# https://docs.sillytavern.app/administration/config-yaml/#user-authentication
export SILLYTAVERN_BASICAUTHMODE=true
export SILLYTAVERN_BASICAUTHUSER_USERNAME="${SILLYTAVERN_USERNAME}"
export SILLYTAVERN_BASICAUTHUSER_PASSWORD="${SILLYTAVERN_PASSWORD}"

cd /home/appuser/app/SillyTavern

echo "ℹ️ SillyTavern を起動中..."
exec node server.js
