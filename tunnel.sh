#!/usr/bin/env bash
# Serves index.html on a public HTTPS URL through a free Cloudflare quick tunnel.
# No account needed. Only index.html is served; the rest of the repo is not reachable.
# Usage: ./tunnel.sh            (PORT=9000 ./tunnel.sh to change the local port)
set -euo pipefail

PORT="${PORT:-8000}"
cd "$(dirname "$0")"

command -v cloudflared >/dev/null || { echo "cloudflared is missing. Install it with: brew install cloudflared"; exit 1; }

# A temp folder holding only a link to index.html, so edits show up on reload.
WEB="$(mktemp -d)"
ln -s "$PWD/index.html" "$WEB/index.html"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WEB" >/dev/null 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null; rm -rf "$WEB"' EXIT

echo "Local:  http://localhost:$PORT"
echo "Starting tunnel… (Ctrl+C to stop)"

cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" 2>&1 | while IFS= read -r line; do
  if [[ $line =~ (https://[a-z0-9-]+\.trycloudflare\.com) ]]; then
    echo "Public: ${BASH_REMATCH[1]}/?topic=<your-topic>&market=PL"
  elif [[ $line == *" ERR "* ]]; then
    echo "$line"
  fi
done
