#!/usr/bin/env bash
# Quickest way to open your LOCAL Clipwave to your phone via a Cloudflare "quick tunnel".
# No Cloudflare account or domain needed — you get a temporary https://<random>.trycloudflare.com URL.
#
# Usage:
#   1) Start Clipwave locally first (Option A or B in the README) so it's on http://localhost:3000
#   2) Run:  bash scripts/phone-tunnel.sh
#   3) Copy the printed https URL, set it as NEXTAUTH_URL (see note), open it on your phone.
#
# Requires cloudflared:  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
#   macOS:   brew install cloudflared
#   Windows: winget install --id Cloudflare.cloudflared
#   Linux:   see the link above
set -e

PORT="${PORT:-3000}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install it, then re-run:"
  echo "  macOS   : brew install cloudflared"
  echo "  Windows : winget install --id Cloudflare.cloudflared"
  echo "  Linux   : https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

cat <<'NOTE'
────────────────────────────────────────────────────────────────────
IMPORTANT for sign-in to work on your phone:
  Quick tunnels get a RANDOM https URL each run. NextAuth needs to know it.
  When the URL appears below, stop your app, set in .env:

      NEXTAUTH_URL=https://<the-random-url>.trycloudflare.com
      APP_URL=https://<the-random-url>.trycloudflare.com

  then start the app again and open that URL on your phone.
  (Media/clips already use relative URLs, so video plays without changes.)
  For a STABLE URL, use a named tunnel — see docker-compose.tunnel.yml.
────────────────────────────────────────────────────────────────────
NOTE

echo "Starting Cloudflare quick tunnel → http://localhost:${PORT} ..."
exec cloudflared tunnel --url "http://localhost:${PORT}"
