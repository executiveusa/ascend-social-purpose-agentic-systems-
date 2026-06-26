#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${INSTALL_ACFS:-false}" = "true" ]; then
  bash scripts/install-acfs.sh
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker or run this inside an ACFS-prepared VPS with Docker available."
  exit 1
fi
if [ ! -f .env ]; then cp .env.example .env; fi
mkdir -p mission-data
npm install
npm test
docker compose -f deploy/docker-compose.yml up -d --build
echo "Mission OS is running. Web: http://localhost:3000 API: http://localhost:4000/api/health"
