#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-dev}"
VERSION_SLUG="${VERSION//\//-}"
ARCHIVE_NAME="scu-laderaum-planer-${VERSION_SLUG}-standalone"
DIST_DIR="${ROOT_DIR}/dist"
PACKAGE_DIR="${DIST_DIR}/${ARCHIVE_NAME}"
PACKAGE_REPOSITORY_URL="$(node -p '(() => { const pkg = require(process.argv[1]); const repo = pkg.repository; if (!repo) return ""; return typeof repo === "string" ? repo : (repo.url || ""); })()' "${ROOT_DIR}/package.json")"
REPOSITORY_URL="${REPOSITORY_URL:-}"
REPOSITORY_LABEL="${REPOSITORY_LABEL:-${GITHUB_REPOSITORY:-}}"

if [[ -z "${REPOSITORY_URL}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  REPOSITORY_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY}"
elif [[ -z "${REPOSITORY_URL}" && -n "${PACKAGE_REPOSITORY_URL}" ]]; then
  REPOSITORY_URL="${PACKAGE_REPOSITORY_URL}"
fi

REPOSITORY_URL="${REPOSITORY_URL#git+}"
if [[ "${REPOSITORY_URL}" == git@github.com:* ]]; then
  REPOSITORY_URL="https://github.com/${REPOSITORY_URL#git@github.com:}"
fi
REPOSITORY_URL="${REPOSITORY_URL%.git}"

if [[ -n "${REPOSITORY_URL}" ]]; then
  REPOSITORY_URL="$(node -p '(() => { const value = process.argv[1]; const url = new URL(value); if (url.protocol !== "https:" && url.protocol !== "http:") { throw new Error("Repository URL must use http or https."); } return url.toString().replace(/\.git$/, ""); })()' "${REPOSITORY_URL}")"
fi

if [[ -z "${REPOSITORY_LABEL}" && -n "${REPOSITORY_URL}" ]]; then
  REPOSITORY_LABEL="$(node -p '(() => { try { const url = new URL(process.argv[1]); return url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/, ""); } catch { return process.argv[1].replace(/\.git$/, ""); } })()' "${REPOSITORY_URL}")"
fi

VERSION_JSON="$(node -p 'JSON.stringify(process.argv[1])' "${VERSION}")"
REPOSITORY_URL_JSON="$(node -p 'JSON.stringify(process.argv[1])' "${REPOSITORY_URL}")"
REPOSITORY_LABEL_JSON="$(node -p 'JSON.stringify(process.argv[1])' "${REPOSITORY_LABEL}")"

rm -rf "${PACKAGE_DIR}"
mkdir -p "${PACKAGE_DIR}"

cp "${ROOT_DIR}/index.html" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/app-standalone.js" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/styles.css" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/README.md" "${PACKAGE_DIR}/"
cp -r "${ROOT_DIR}/translations" "${PACKAGE_DIR}/"

cat > "${PACKAGE_DIR}/build-info.js" <<EOF
(function (global) {
  global.SCU_PLANNER_BUILD_INFO = {
    version: ${VERSION_JSON},
    repositoryUrl: ${REPOSITORY_URL_JSON},
    repositoryLabel: ${REPOSITORY_LABEL_JSON}
  };
}(globalThis));
EOF

if [[ -f "${ROOT_DIR}/LICENSE" ]]; then
  cp "${ROOT_DIR}/LICENSE" "${PACKAGE_DIR}/"
fi

cat > "${PACKAGE_DIR}/START_HERE.txt" <<EOF
SCU-Laderaum-Planer Standalone

1. Archiv entpacken
2. index.html im Browser öffnen

Der Standalone-Build ist für den Direktstart über index.html vorbereitet.
EOF

(
  cd "${DIST_DIR}"
  rm -f "${ARCHIVE_NAME}.zip" "${ARCHIVE_NAME}.tar.gz" "SHA256SUMS.txt"
  zip -qr "${ARCHIVE_NAME}.zip" "${ARCHIVE_NAME}"
  tar -czf "${ARCHIVE_NAME}.tar.gz" "${ARCHIVE_NAME}"
  sha256sum "${ARCHIVE_NAME}.zip" "${ARCHIVE_NAME}.tar.gz" > "SHA256SUMS.txt"
)
