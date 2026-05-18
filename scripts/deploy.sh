#!/bin/bash
# ═══════════════════════════════════════════════════════
# FraudShield Deployment Script
# Usage: ./scripts/deploy.sh [local|staging|production]
# ═══════════════════════════════════════════════════════

set -euo pipefail

# ─── Colors ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── Functions ───────────────────────────────────────────
log()     { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $1${NC}"; }
error()   { echo -e "${RED}❌ $1${NC}"; exit 1; }
section() { echo -e "\n${BLUE}══════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════${NC}\n"; }

# ─── Validate environment ─────────────────────────────────
ENV=${1:-local}

if [[ ! "$ENV" =~ ^(local|staging|production)$ ]]; then
  error "Invalid environment. Use: local, staging, or production"
fi

section "🛡️  FraudShield Deploy → $ENV"

# ─── Check prerequisites ──────────────────────────────────
log "Checking prerequisites..."

command -v docker   >/dev/null 2>&1 || error "Docker is not installed"
command -v node     >/dev/null 2>&1 || error "Node.js is not installed"

NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  error "Node.js 18+ required (found v$NODE_VER)"
fi

success "Prerequisites OK"

# ─── LOCAL deployment ─────────────────────────────────────
if [ "$ENV" == "local" ]; then
  section "🏠 Local Development"

  # Check for .env
  if [ ! -f "backend/.env" ]; then
    warn ".env not found — copying from example"
    cp backend/.env.example backend/.env
    warn "Edit backend/.env with your DB password before continuing"
    read -p "Press ENTER after editing .env..."
  fi

  log "Installing backend dependencies..."
  cd backend && npm install && cd ..

  log "Installing frontend dependencies..."
  cd frontend && npm install && cd ..

  log "Starting Docker services (PostgreSQL)..."
  docker compose up -d postgres

  log "Waiting for PostgreSQL to be ready..."
  until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do
    echo -n "."
    sleep 2
  done
  echo ""
  success "PostgreSQL is ready"

  log "Seeding database..."
  cd backend && npm run seed && cd ..

  success "Local environment ready!"
  echo ""
  echo -e "  ${GREEN}Backend:${NC}  npm run dev   (in backend/)"
  echo -e "  ${GREEN}Frontend:${NC} npm start     (in frontend/)"
  echo -e "  ${GREEN}DB:${NC}       localhost:5432"
  echo ""
fi

# ─── STAGING deployment ───────────────────────────────────
if [ "$ENV" == "staging" ]; then
  section "🧪 Staging Deployment"

  [ -z "${STAGING_HOST:-}" ] && error "STAGING_HOST env variable not set"
  [ -z "${STAGING_USER:-}" ] && error "STAGING_USER env variable not set"

  log "Building Docker images..."
  docker compose build --no-cache

  log "Pushing to registry..."
  docker compose push

  log "Deploying to staging server..."
  ssh "$STAGING_USER@$STAGING_HOST" << 'ENDSSH'
    cd /opt/fraudshield
    docker compose -f docker-compose.staging.yml pull
    docker compose -f docker-compose.staging.yml up -d --remove-orphans
    docker image prune -f
    echo "Staging deployed!"
ENDSSH

  log "Waiting for staging to come up (30s)..."
  sleep 30

  log "Health check..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://staging.fraudshield.io/api/health" || echo "000")
  if [ "$HTTP_CODE" == "200" ]; then
    success "Staging health check passed (HTTP $HTTP_CODE)"
  else
    error "Staging health check failed (HTTP $HTTP_CODE)"
  fi
fi

# ─── PRODUCTION deployment ────────────────────────────────
if [ "$ENV" == "production" ]; then
  section "🏭 Production Deployment"

  [ -z "${PROD_HOST:-}" ] && error "PROD_HOST env variable not set"
  [ -z "${PROD_USER:-}" ] && error "PROD_USER env variable not set"

  # Safety prompt
  echo -e "${RED}⚠️  You are deploying to PRODUCTION!${NC}"
  read -p "Type 'yes' to confirm: " CONFIRM
  [ "$CONFIRM" != "yes" ] && error "Deployment cancelled"

  log "Creating pre-deploy backup..."
  ssh "$PROD_USER@$PROD_HOST" \
    "docker exec fraudshield-postgres-prod pg_dump -U postgres fraudshield > /backups/pre_deploy_$(date +%Y%m%d_%H%M%S).sql"
  success "Database backed up"

  log "Pulling latest images on production..."
  ssh "$PROD_USER@$PROD_HOST" << 'ENDSSH'
    cd /opt/fraudshield
    docker compose -f docker-compose.prod.yml pull
    docker compose -f docker-compose.prod.yml up -d --remove-orphans --no-deps backend
    sleep 15
    docker compose -f docker-compose.prod.yml up -d --remove-orphans --no-deps frontend
    docker image prune -f
    echo "Production deployed!"
ENDSSH

  log "Waiting 30s for production to stabilize..."
  sleep 30

  log "Production health check..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://fraudshield.io/api/health" || echo "000")
  if [ "$HTTP_CODE" == "200" ]; then
    success "Production health check passed!"
  else
    error "Production health check FAILED (HTTP $HTTP_CODE) — consider rollback!"
  fi
fi

section "🎉 Deployment Complete"
success "Environment: $ENV"
log "Finished at $(date)"
