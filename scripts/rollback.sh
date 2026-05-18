#!/bin/bash
# ═══════════════════════════════════════════════════════
# FraudShield Rollback Script
# Usage: ./scripts/rollback.sh [staging|production] [git-sha]
# Example: ./scripts/rollback.sh production abc1234
# ═══════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

error()   { echo -e "${RED}❌ $1${NC}"; exit 1; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
log()     { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }

ENV=${1:-production}
SHA=${2:-}

echo -e "\n${RED}══════════════════════════════════${NC}"
echo -e "${RED}  🔄 ROLLBACK → $ENV${NC}"
echo -e "${RED}══════════════════════════════════${NC}\n"

if [ -z "$SHA" ]; then
  echo "Available recent images (last 5):"
  docker images "ghcr.io/*/backend" --format "{{.Tag}}\t{{.CreatedAt}}" | head -5
  echo ""
  read -p "Enter the git SHA or tag to rollback to: " SHA
fi

[ -z "$SHA" ] && error "No SHA provided"

echo -e "${YELLOW}Rolling back to: $SHA${NC}"
read -p "Confirm rollback? (yes/no): " CONFIRM
[ "$CONFIRM" != "yes" ] && error "Rollback cancelled"

REPO="ghcr.io/${GITHUB_REPOSITORY:-your-org/fraud-shield}"
BACKEND_IMAGE="$REPO/backend:$SHA"
FRONTEND_IMAGE="$REPO/frontend:$SHA"

log "Verifying images exist..."
docker pull "$BACKEND_IMAGE"  || error "Backend image $SHA not found"
docker pull "$FRONTEND_IMAGE" || error "Frontend image $SHA not found"

if [ "$ENV" == "production" ]; then
  HOST="${PROD_HOST:-}"
  USER="${PROD_USER:-}"
  COMPOSE_FILE="docker-compose.prod.yml"
else
  HOST="${STAGING_HOST:-}"
  USER="${STAGING_USER:-}"
  COMPOSE_FILE="docker-compose.staging.yml"
fi

[ -z "$HOST" ] && error "${ENV^^}_HOST not set"
[ -z "$USER" ] && error "${ENV^^}_USER not set"

log "Executing rollback on $HOST..."
ssh "$USER@$HOST" << ENDSSH
  cd /opt/fraudshield
  export BACKEND_IMAGE=$BACKEND_IMAGE
  export FRONTEND_IMAGE=$FRONTEND_IMAGE
  docker compose -f $COMPOSE_FILE up -d --no-build backend frontend
  echo "Rollback applied"
ENDSSH

log "Waiting 20s..."
sleep 20

if [ "$ENV" == "production" ]; then
  URL="https://fraudshield.io/api/health"
else
  URL="https://staging.fraudshield.io/api/health"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
  success "Rollback successful! Health check passed (HTTP $HTTP_CODE)"
else
  error "Rollback health check FAILED (HTTP $HTTP_CODE)"
fi
