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

: "${GITHUB_REPOSITORY:?Please set GITHUB_REPOSITORY in deploy/traefik/.env}"

RELEASE_ASSET_SUFFIX="${RELEASE_ASSET_SUFFIX:--standalone.tar.gz}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
RUNTIME_DIR="${SCRIPT_DIR}/runtime"
CURRENT_DIR="${RUNTIME_DIR}/current"
RELEASES_DIR="${RUNTIME_DIR}/releases"
STATE_DIR="${RUNTIME_DIR}/state"
TMP_DIR="${RUNTIME_DIR}/tmp"
CURRENT_VERSION_FILE="${STATE_DIR}/current-version"

mkdir -p "${CURRENT_DIR}" "${RELEASES_DIR}" "${STATE_DIR}" "${TMP_DIR}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required." >&2
  exit 1
fi

AUTH_HEADER=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

RELEASE_JSON="$(curl -fsSL \
  -H "Accept: application/vnd.github+json" \
  "${AUTH_HEADER[@]}" \
  "https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/latest")"

readarray -t RELEASE_META < <(
  RELEASE_ASSET_SUFFIX="${RELEASE_ASSET_SUFFIX}" python3 -c '
import json
import os
import sys

payload = json.load(sys.stdin)
suffix = os.environ["RELEASE_ASSET_SUFFIX"]
tag = payload.get("tag_name", "").strip()

if not tag:
    raise SystemExit("Latest release has no tag_name.")

asset_url = ""
for asset in payload.get("assets", []):
    url = asset.get("browser_download_url", "")
    if url.endswith(suffix):
        asset_url = url
        break

if not asset_url:
    raise SystemExit(f"No release asset ending with {suffix!r} found.")

print(tag)
print(asset_url)
' <<<"${RELEASE_JSON}"
)

LATEST_TAG="${RELEASE_META[0]}"
ASSET_URL="${RELEASE_META[1]}"
CURRENT_TAG=""

if [[ -f "${CURRENT_VERSION_FILE}" ]]; then
  CURRENT_TAG="$(<"${CURRENT_VERSION_FILE}")"
fi

if [[ "${CURRENT_TAG}" == "${LATEST_TAG}" && -f "${CURRENT_DIR}/index.html" ]]; then
  echo "Already up to date: ${LATEST_TAG}"
  exit 0
fi

ARCHIVE_PATH="${TMP_DIR}/${LATEST_TAG}${RELEASE_ASSET_SUFFIX}"
EXTRACT_DIR="${TMP_DIR}/extract-${LATEST_TAG}"
TARGET_RELEASE_DIR="${RELEASES_DIR}/${LATEST_TAG}"

rm -rf "${ARCHIVE_PATH}" "${EXTRACT_DIR}"
mkdir -p "${EXTRACT_DIR}"

curl -fsSL "${AUTH_HEADER[@]}" -o "${ARCHIVE_PATH}" "${ASSET_URL}"
tar -xzf "${ARCHIVE_PATH}" -C "${EXTRACT_DIR}"

EXTRACTED_APP_DIR="$(find "${EXTRACT_DIR}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [[ -z "${EXTRACTED_APP_DIR}" ]]; then
  echo "Could not find extracted release directory." >&2
  exit 1
fi

rm -rf "${TARGET_RELEASE_DIR}"
mkdir -p "${TARGET_RELEASE_DIR}"
cp -a "${EXTRACTED_APP_DIR}/." "${TARGET_RELEASE_DIR}/"

find "${CURRENT_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
cp -a "${TARGET_RELEASE_DIR}/." "${CURRENT_DIR}/"

printf '%s\n' "${LATEST_TAG}" > "${CURRENT_VERSION_FILE}"
rm -rf "${ARCHIVE_PATH}" "${EXTRACT_DIR}"

if [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  mapfile -t OLD_RELEASES < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d | sort)
  if (( ${#OLD_RELEASES[@]} > KEEP_RELEASES )); then
    for old_release in "${OLD_RELEASES[@]:0:${#OLD_RELEASES[@]}-KEEP_RELEASES}"; do
      rm -rf "${old_release}"
    done
  fi
fi

echo "Updated deployment to ${LATEST_TAG}"
