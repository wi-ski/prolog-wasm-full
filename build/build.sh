#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="prolog-wasm-full-build"

echo "Building SWI-Prolog 10.1.4 WASM with addFunction + ALLOW_TABLE_GROWTH..."
echo "This takes 10-20 minutes on first run."

docker build \
  -t "${IMAGE_NAME}" \
  "${SCRIPT_DIR}"

echo "Extracting artifacts..."
mkdir -p "${PACKAGE_DIR}/vendor"

CONTAINER_ID=$(docker create "${IMAGE_NAME}")
docker cp "${CONTAINER_ID}:/output/swipl-web.js" "${PACKAGE_DIR}/vendor/swipl-web.js"
docker cp "${CONTAINER_ID}:/output/swipl-web.wasm" "${PACKAGE_DIR}/vendor/swipl-web.wasm"
docker cp "${CONTAINER_ID}:/output/swipl-web.data" "${PACKAGE_DIR}/vendor/swipl-web.data"
docker rm "${CONTAINER_ID}"

echo "Done. Artifacts in vendor/:"
ls -lh "${PACKAGE_DIR}/vendor/"
