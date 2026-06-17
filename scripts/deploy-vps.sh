#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/metrics-app}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

# Pull latest immutable images produced by the CI/CD pipeline.
docker compose -f "$COMPOSE_FILE" pull

# Recreate services only when image/configuration changed.
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Keep the host clean after deployments.
docker image prune -f

# Display final service status for the GitHub Actions log.
docker compose -f "$COMPOSE_FILE" ps
