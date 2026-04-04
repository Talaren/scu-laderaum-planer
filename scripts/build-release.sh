#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-dev}"
VERSION_SLUG="${VERSION//\//-}"
ARCHIVE_NAME="scu-laderaum-planer-${VERSION_SLUG}-standalone"
DIST_DIR="${ROOT_DIR}/dist"
PACKAGE_DIR="${DIST_DIR}/${ARCHIVE_NAME}"

rm -rf "${PACKAGE_DIR}"
mkdir -p "${PACKAGE_DIR}"

cp "${ROOT_DIR}/index.html" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/app-standalone.js" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/styles.css" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/README.md" "${PACKAGE_DIR}/"

if [[ -f "${ROOT_DIR}/LICENSE" ]]; then
  cp "${ROOT_DIR}/LICENSE" "${PACKAGE_DIR}/"
fi

cat > "${PACKAGE_DIR}/START_HERE.txt" <<EOF
SCU-Laderaum-Planer Standalone

1. Archiv entpacken
2. index.html im Browser oeffnen

Der Standalone-Build ist fuer den Direktstart ueber index.html vorbereitet.
EOF

(
  cd "${DIST_DIR}"
  rm -f "${ARCHIVE_NAME}.zip" "${ARCHIVE_NAME}.tar.gz" "SHA256SUMS.txt"
  zip -qr "${ARCHIVE_NAME}.zip" "${ARCHIVE_NAME}"
  tar -czf "${ARCHIVE_NAME}.tar.gz" "${ARCHIVE_NAME}"
  sha256sum "${ARCHIVE_NAME}.zip" "${ARCHIVE_NAME}.tar.gz" > "SHA256SUMS.txt"
)
