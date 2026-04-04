#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

: "${TRAEFIK_NETWORK:?Please set TRAEFIK_NETWORK in deploy/traefik/.env}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required." >&2
  exit 1
fi

if ! docker network inspect "${TRAEFIK_NETWORK}" >/dev/null 2>&1; then
  echo "Docker network '${TRAEFIK_NETWORK}' was not found." >&2
  echo "Set TRAEFIK_NETWORK in deploy/traefik/.env to the network your Traefik container uses." >&2
  echo "Common names are 'traefik', 'traefik_default' or 'proxy'." >&2
  echo >&2
  echo "Available Docker networks:" >&2
  docker network ls --format '  - {{.Name}}' >&2 || true
  exit 1
fi

"${SCRIPT_DIR}/update-release.sh"
docker compose --env-file "${SCRIPT_DIR}/.env" -f "${SCRIPT_DIR}/docker-compose.yml" up -d
