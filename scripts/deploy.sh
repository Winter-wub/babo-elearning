#!/usr/bin/env bash
# =============================================================================
# scripts/deploy.sh — First-time fly.io setup and subsequent deploys
#
# Usage:
#   chmod +x scripts/deploy.sh
#
#   # First-time setup (provisions all fly.io resources):
#   ./scripts/deploy.sh setup
#
#   # Deploy the latest code (after initial setup):
#   ./scripts/deploy.sh deploy
#
#   # Set / rotate secrets only:
#   ./scripts/deploy.sh secrets
#
# Prerequisites:
#   - flyctl installed: https://fly.io/docs/hands-on/install-flyctl/
#   - Logged in: flyctl auth login
#   - Cloudflare R2 credentials ready
#
# What this script does NOT do:
#   - Run database migrations — fly.io handles that automatically via
#     `release_command` in fly.toml before traffic is routed to each deploy.
# =============================================================================

set -euo pipefail

# --------------------------------------------------------------------------- #
# Config — change these to match your desired fly.io resource names           #
# --------------------------------------------------------------------------- #
APP_NAME="e-learning-platform"
DB_NAME="e-learning-platform-db"
MINIO_APP_NAME="e-learning-platform-minio"
REGION="sin"   # Singapore; see `flyctl platform regions` for options

# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #
info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }
error() { echo "[ERROR] $*" >&2; exit 1; }

require_flyctl() {
  command -v flyctl &>/dev/null || error "flyctl not found. Install it from https://fly.io/docs/hands-on/install-flyctl/"
}

require_env() {
  local var="$1"
  [[ -n "${!var:-}" ]] || error "Required environment variable \$$var is not set."
}

# --------------------------------------------------------------------------- #
# Step 1 — Create the fly.io app                                               #
# --------------------------------------------------------------------------- #
create_app() {
  info "Creating fly.io app: $APP_NAME in region $REGION"

  # `--no-deploy` skips the first deploy so we can attach the DB first.
  # If the app already exists, this command is a no-op (fly returns exit 0).
  flyctl apps create "$APP_NAME" --machines || warn "App may already exist — continuing."
}

# --------------------------------------------------------------------------- #
# Step 2 — Provision and attach a managed Postgres cluster                    #
# --------------------------------------------------------------------------- #
create_postgres() {
  info "Creating Postgres cluster: $DB_NAME in region $REGION"
  info "Using the development plan (single machine, 1 GB storage)."
  info "Upgrade to a higher plan for production via: flyctl postgres update $DB_NAME"

  # `--initial-cluster-size 1` = single node (cheapest; add replicas later)
  flyctl postgres create \
    --name "$DB_NAME" \
    --region "$REGION" \
    --initial-cluster-size 1 \
    --vm-size shared-cpu-1x \
    --volume-size 1 \
    || warn "Postgres cluster may already exist — continuing."

  info "Attaching Postgres cluster to app (sets DATABASE_URL secret automatically)"
  # --no-proxy attaches to the internal .flycast network, no proxy overhead
  flyctl postgres attach "$DB_NAME" \
    --app "$APP_NAME" \
    || warn "Postgres may already be attached — continuing."
}

# --------------------------------------------------------------------------- #
# Step 2b — Provision MinIO (S3-compatible storage) on Fly.io                  #
# --------------------------------------------------------------------------- #
create_minio() {
  info "Creating MinIO app: $MINIO_APP_NAME in region $REGION"

  flyctl apps create "$MINIO_APP_NAME" --machines || warn "MinIO app may already exist — continuing."

  info "Creating persistent volume for MinIO data (10 GB)"
  flyctl volumes create minio_data \
    --size 10 \
    --region "$REGION" \
    --app "$MINIO_APP_NAME" \
    || warn "Volume may already exist — continuing."

  info "Setting MinIO credentials"
  echo -n "MINIO_ROOT_USER (default: minioadmin) > "
  read -r MINIO_USER_VAL
  MINIO_USER_VAL="${MINIO_USER_VAL:-minioadmin}"
  echo -n "MINIO_ROOT_PASSWORD (min 8 chars) > "
  read -rs MINIO_PASS_VAL
  echo ""
  MINIO_PASS_VAL="${MINIO_PASS_VAL:-minioadmin}"

  flyctl secrets set \
    MINIO_ROOT_USER="$MINIO_USER_VAL" \
    MINIO_ROOT_PASSWORD="$MINIO_PASS_VAL" \
    --app "$MINIO_APP_NAME"

  info "Deploying MinIO"
  flyctl deploy --config fly.minio.toml --app "$MINIO_APP_NAME" --remote-only

  info "MinIO deployed. Creating bucket via flyctl ssh..."
  # Wait for machine to be ready
  sleep 5
  flyctl ssh console --app "$MINIO_APP_NAME" -C \
    "mc alias set local http://localhost:9000 $MINIO_USER_VAL $MINIO_PASS_VAL && mc mb --ignore-existing local/elearning-videos" \
    || warn "Could not create bucket automatically — create it manually via the MinIO console."

  # Store credentials for the secrets step
  export _MINIO_USER="$MINIO_USER_VAL"
  export _MINIO_PASS="$MINIO_PASS_VAL"

  info "MinIO is available at: http://$MINIO_APP_NAME.internal:9000 (Fly private network)"
  info "MinIO console: https://$MINIO_APP_NAME.fly.dev:9001"
}

# --------------------------------------------------------------------------- #
# Step 3 — Set application secrets                                             #
# --------------------------------------------------------------------------- #
set_secrets() {
  info "Setting fly.io secrets for $APP_NAME"
  info "You will be prompted for each secret value."
  info "Press Enter to skip a secret if it is already set."
  echo ""

  # ------------------------------------------------------------------ #
  # Auth.js                                                              #
  # ------------------------------------------------------------------ #
  echo -n "AUTH_SECRET (generate with: openssl rand -base64 32) > "
  read -r AUTH_SECRET_VAL
  echo -n "AUTH_URL (e.g. https://e-learning-platform.fly.dev) > "
  read -r AUTH_URL_VAL

  # ------------------------------------------------------------------ #
  # S3-compatible storage (MinIO on Fly private network)                 #
  # ------------------------------------------------------------------ #
  local MINIO_USER="${_MINIO_USER:-minioadmin}"
  local MINIO_PASS="${_MINIO_PASS:-minioadmin}"

  echo -n "R2_ENDPOINT (default: http://$MINIO_APP_NAME.internal:9000) > "
  read -r R2_ENDPOINT_VAL
  R2_ENDPOINT_VAL="${R2_ENDPOINT_VAL:-http://$MINIO_APP_NAME.internal:9000}"

  echo -n "R2_ACCOUNT_ID (default: minio) > "
  read -r R2_ACCOUNT_ID_VAL
  R2_ACCOUNT_ID_VAL="${R2_ACCOUNT_ID_VAL:-minio}"

  echo -n "R2_ACCESS_KEY_ID (default: $MINIO_USER) > "
  read -r R2_ACCESS_KEY_ID_VAL
  R2_ACCESS_KEY_ID_VAL="${R2_ACCESS_KEY_ID_VAL:-$MINIO_USER}"

  echo -n "R2_SECRET_ACCESS_KEY (default: from MinIO setup) > "
  read -rs R2_SECRET_ACCESS_KEY_VAL
  R2_SECRET_ACCESS_KEY_VAL="${R2_SECRET_ACCESS_KEY_VAL:-$MINIO_PASS}"
  echo ""

  echo -n "R2_BUCKET_NAME (default: elearning-videos) > "
  read -r R2_BUCKET_NAME_VAL
  R2_BUCKET_NAME_VAL="${R2_BUCKET_NAME_VAL:-elearning-videos}"

  # ------------------------------------------------------------------ #
  # App public URL (baked into the CORS header at runtime)               #
  # ------------------------------------------------------------------ #
  echo -n "NEXT_PUBLIC_APP_URL (e.g. https://e-learning-platform.fly.dev) > "
  read -r NEXT_PUBLIC_APP_URL_VAL

  # Build the secrets string; skip any that were left blank
  SECRETS_ARGS=""

  [[ -n "$AUTH_SECRET_VAL"           ]] && SECRETS_ARGS+=" AUTH_SECRET=$AUTH_SECRET_VAL"
  [[ -n "$AUTH_URL_VAL"              ]] && SECRETS_ARGS+=" AUTH_URL=$AUTH_URL_VAL"
  [[ -n "$R2_ENDPOINT_VAL"           ]] && SECRETS_ARGS+=" R2_ENDPOINT=$R2_ENDPOINT_VAL"
  [[ -n "$R2_ACCOUNT_ID_VAL"        ]] && SECRETS_ARGS+=" R2_ACCOUNT_ID=$R2_ACCOUNT_ID_VAL"
  [[ -n "$R2_ACCESS_KEY_ID_VAL"     ]] && SECRETS_ARGS+=" R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID_VAL"
  [[ -n "$R2_SECRET_ACCESS_KEY_VAL" ]] && SECRETS_ARGS+=" R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY_VAL"
  [[ -n "$R2_BUCKET_NAME_VAL"       ]] && SECRETS_ARGS+=" R2_BUCKET_NAME=$R2_BUCKET_NAME_VAL"
  [[ -n "$NEXT_PUBLIC_APP_URL_VAL"  ]] && SECRETS_ARGS+=" NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL_VAL"

  if [[ -n "$SECRETS_ARGS" ]]; then
    # word-splitting on SECRETS_ARGS is intentional here
    # shellcheck disable=SC2086
    flyctl secrets set $SECRETS_ARGS --app "$APP_NAME"
    info "Secrets set successfully."
  else
    warn "No secrets were provided — skipping."
  fi
}

# --------------------------------------------------------------------------- #
# Step 4 — Deploy                                                              #
# --------------------------------------------------------------------------- #
deploy() {
  info "Deploying $APP_NAME ..."
  info "fly.io will:"
  info "  1. Build the Docker image from Dockerfile"
  info "  2. Run release_command (prisma migrate deploy) before routing traffic"
  info "  3. Perform a rolling deploy across machines"
  echo ""

  flyctl deploy --app "$APP_NAME" --remote-only
}

# --------------------------------------------------------------------------- #
# Entrypoint                                                                   #
# --------------------------------------------------------------------------- #
require_flyctl

COMMAND="${1:-deploy}"

case "$COMMAND" in
  setup)
    info "=== fly.io first-time setup for $APP_NAME ==="
    create_app
    create_postgres
    create_minio
    set_secrets
    deploy
    info ""
    info "=== Setup complete ==="
    info "App URL: https://$APP_NAME.fly.dev"
    info ""
    info "Useful commands:"
    info "  flyctl logs --app $APP_NAME          # tail live logs"
    info "  flyctl status --app $APP_NAME        # machine health"
    info "  flyctl ssh console --app $APP_NAME   # SSH into a running machine"
    info "  flyctl postgres connect --app $DB_NAME  # psql into the database"
    ;;
  deploy)
    deploy
    ;;
  secrets)
    set_secrets
    ;;
  *)
    echo "Usage: $0 [setup|deploy|secrets]"
    exit 1
    ;;
esac
