#!/usr/bin/env bash

set -euo pipefail

THIS_DIR=$(cd $(dirname $0); pwd)
USER_SCRIPT_DIR=$THIS_DIR/scripts-user
ROOT_SCRIPT_DIR=$THIS_DIR/scripts-root

${ROOT_SCRIPT_DIR}/add_appuser.sh
${ROOT_SCRIPT_DIR}/install_apt_dependencies.sh
su - appuser -c "${USER_SCRIPT_DIR}/install_bun_dependencies.sh"
su - appuser -c "${USER_SCRIPT_DIR}/run_n8n.sh"
su - appuser -c "${USER_SCRIPT_DIR}/run_cloudflared.sh"
sleep infinity
