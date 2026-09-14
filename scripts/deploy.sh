#!/usr/bin/env bash
set -euo pipefail

umask 077

APP_PATH="${APP_PATH:-/root/E-commerce}"
APP_NAME="${PM2_APP_NAME:-e-commerce}"
SOURCE_DIR="${SOURCE_DIR:-$PWD}"
RELEASES_DIR="${RELEASES_DIR:-/root/E-commerce-releases}"
SHARED_DIR="${SHARED_DIR:-/root/E-commerce-shared}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/}"
HEALTH_MAX_ATTEMPTS="${HEALTH_MAX_ATTEMPTS:-15}"
HEALTH_RETRY_DELAY="${HEALTH_RETRY_DELAY:-2}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

fail() {
  printf 'Deploy aborted: %s\n' "$1" >&2
  exit 1
}

critical_fail() {
  printf 'CRITICAL: %s\n' "$1" >&2
  exit 2
}

for required_command in rsync npm pm2 curl; do
  command -v "$required_command" >/dev/null 2>&1 || fail "missing command: $required_command"
done

[[ -f "$SOURCE_DIR/package.json" ]] || fail "SOURCE_DIR does not contain package.json"
[[ -d "$APP_PATH" || -L "$APP_PATH" ]] || fail "live application path does not exist"
case "$SOURCE_DIR/" in
  "$APP_PATH/"*) fail "run from a separate staging directory, never from the live application directory" ;;
esac

mkdir -p "$RELEASES_DIR" "$SHARED_DIR"
SHARED_ENV="$SHARED_DIR/.env.local"
if [[ ! -f "$SHARED_ENV" ]]; then
  [[ -f "$APP_PATH/.env.local" ]] || fail "missing $SHARED_ENV and live .env.local"
  cp -p "$APP_PATH/.env.local" "$SHARED_ENV"
  chmod 600 "$SHARED_ENV"
fi

RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-$$"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
mkdir "$RELEASE_DIR"

rsync -a --delete \
  --exclude='.git/' \
  --exclude='.next/' \
  --exclude='node_modules/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.log' \
  "$SOURCE_DIR/" "$RELEASE_DIR/"
ln -s "$SHARED_ENV" "$RELEASE_DIR/.env.local"

cd "$RELEASE_DIR"
npm ci --include=dev
export NEXT_DEPLOYMENT_ID="$RELEASE_ID"
npm run build
[[ -f "$RELEASE_DIR/.next/standalone/server.js" ]] || fail "standalone build was not created"

PREVIOUS_TARGET=''
CURRENT_IS_DIRECTORY=false
if [[ -L "$APP_PATH" ]]; then
  PREVIOUS_TARGET="$(readlink -f "$APP_PATH")"
elif [[ -d "$APP_PATH" ]]; then
  PREVIOUS_TARGET="$RELEASES_DIR/legacy-$RELEASE_ID"
  CURRENT_IS_DIRECTORY=true
elif [[ -e "$APP_PATH" ]]; then
  fail "$APP_PATH exists and is neither a directory nor a symlink"
fi

switch_release() {
  local target="$1"
  local next_link="${APP_PATH}.next-$RELEASE_ID"
  ln -s "$target" "$next_link"
  if mv -Tf "$next_link" "$APP_PATH" 2>/dev/null; then
    return 0
  else
    rm -f "$next_link"
    ln -sfn "$target" "$APP_PATH"
  fi
}

rollback() {
  printf 'Initiating rollback to previous release: %s\n' "${PREVIOUS_TARGET:-none}" >&2
  if [[ -z "$PREVIOUS_TARGET" || ! -d "$PREVIOUS_TARGET" ]]; then
    critical_fail "Rollback failed: previous release directory does not exist (${PREVIOUS_TARGET:-empty})"
  fi

  if ! switch_release "$PREVIOUS_TARGET"; then
    critical_fail "Rollback failed: unable to restore symlink to $PREVIOUS_TARGET"
  fi

  if ! pm2 restart "$APP_NAME" --update-env; then
    critical_fail "Rollback failed: PM2 failed to restart previous release $APP_NAME"
  fi

  printf 'Rollback successful: previous release %s restored.\n' "$PREVIOUS_TARGET" >&2
}

if ! pm2 stop "$APP_NAME"; then
  fail "could not stop the current PM2 process"
fi

if [[ "$CURRENT_IS_DIRECTORY" == true ]] && ! mv "$APP_PATH" "$PREVIOUS_TARGET"; then
  pm2 restart "$APP_NAME" --update-env >/dev/null 2>&1 || true
  fail "could not preserve the previous release"
fi

if ! switch_release "$RELEASE_DIR"; then
  rollback
  fail "release switch failed; previous release restored"
fi

if ! pm2 restart "$APP_NAME" --update-env; then
  rollback
  fail "PM2 restart failed; previous release restored"
fi

healthy=false
for attempt in $(seq 1 "$HEALTH_MAX_ATTEMPTS"); do
  status_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$status_code" =~ ^[23][0-9]{2}$ ]]; then
    healthy=true
    printf 'Health check passed (attempt %s/%s, HTTP %s)\n' "$attempt" "$HEALTH_MAX_ATTEMPTS" "$status_code"
    break
  fi
  printf 'Health check waiting... (attempt %s/%s, status: %s, retrying in %ss)\n' "$attempt" "$HEALTH_MAX_ATTEMPTS" "${status_code:-unreachable}" "$HEALTH_RETRY_DELAY"
  if [[ "$attempt" -lt "$HEALTH_MAX_ATTEMPTS" ]]; then
    sleep "$HEALTH_RETRY_DELAY"
  fi
done

if [[ "$healthy" != true ]]; then
  printf 'Health check failed: application did not respond with valid HTTP status after %s attempts\n' "$HEALTH_MAX_ATTEMPTS" >&2
  rollback
  fail "health check failed; previous release restored"
fi

pm2 save >/dev/null

mapfile -t releases < <(
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -rn \
    | cut -d' ' -f2-
)
CURRENT_TARGET="$(readlink -f "$APP_PATH")"
for ((index = KEEP_RELEASES; index < ${#releases[@]}; index += 1)); do
  candidate="${releases[$index]}"
  if [[ "$candidate" != "$CURRENT_TARGET" && "$candidate" != "$PREVIOUS_TARGET" ]]; then
    rm -rf -- "$candidate"
  fi
done

printf 'Deploy complete: %s\n' "$RELEASE_ID"
