#!/bin/sh
set -e

echo "→ Applying database migrations..."
node node_modules/prisma/build/index.js migrate deploy || {
  echo "migrate deploy failed (is DATABASE_URL set and reachable?)"; exit 1;
}

echo "→ Starting Clipwave (inline mode) on :${PORT:-3000}"
# New users are auto-provisioned with a Starter plan + welcome credits on first sign-in,
# so no seeding step is required. Just sign in with any email.
exec node server.js
