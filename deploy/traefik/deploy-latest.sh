#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/update-release.sh"
docker compose --env-file "${SCRIPT_DIR}/.env" -f "${SCRIPT_DIR}/docker-compose.yml" up -d
