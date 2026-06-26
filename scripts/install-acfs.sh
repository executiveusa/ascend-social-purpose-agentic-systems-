#!/usr/bin/env bash
set -euo pipefail

# Installs/updates Agentic Coding Flywheel Setup on the VPS host.
# Use ACFS_REF to pin a release or commit for reproducible production installs.
ACFS_REF="${ACFS_REF:-main}"
ACFS_MODE="${ACFS_MODE:-vibe}"
ACFS_URL="https://raw.githubusercontent.com/Dicklesworthstone/agentic_coding_flywheel_setup/${ACFS_REF}/install.sh"

if command -v acfs >/dev/null 2>&1; then
  echo "ACFS already installed: $(command -v acfs)"
  acfs doctor || true
  exit 0
fi

echo "Installing ACFS from ${ACFS_REF}..."
curl -fsSL "${ACFS_URL}?$(date +%s)" | bash -s -- --yes --mode "${ACFS_MODE}" --ref "${ACFS_REF}"

echo "ACFS install completed. Run: acfs doctor"
