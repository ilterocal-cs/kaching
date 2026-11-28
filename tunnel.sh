#!/usr/bin/env bash
# Serves the public/ folder on a public HTTPS URL through a free Cloudflare quick tunnel.
# No account needed. Only public/ is served, like on GitHub Pages; the rest of the repo is not reachable.
# Usage: ./tunnel.sh            (PORT=9000 ./tunnel.sh to change the local port)
# Printed URLs include KACHING_TEST_PARAMS from the git-ignored test.local.env, if it exists.
set -euo pipefail

PORT="${PORT:-8000}"
cd "$(dirname "$0")"

PARAMS="?topic=<your-topic>&market=PL"
if [[ -f test.local.env ]]; then
  # shellcheck source=/dev/null
  source test.local.env
  PARAMS="${KACHING_TEST_PARAMS:-$PARAMS}"
fi

command -v cloudflared >/dev/null || { echo "cloudflared is missing. Install it with: brew install cloudflared"; exit 1; }

# Refresh the asset hashes, then serve public/ (edits show up on reload; re-run the build after asset changes).
node build.mjs >/dev/null

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory public >/dev/null 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null' EXIT

echo "Local:  http://localhost:$PORT/$PARAMS"
echo "Starting tunnel… (Ctrl+C to stop)"

cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" 2>&1 | while IFS= read -r line; do
  if [[ $line =~ (https://[a-z0-9-]+\.trycloudflare\.com) ]]; then
    # The new hostname takes a few seconds to appear in DNS. Opening it earlier makes
    # macOS cache "not found" for a while, so only print the URL once DNS has it.
    # dig asks the DNS server directly, so it doesn't create that cached failure.
    url="${BASH_REMATCH[1]}"
    (
      echo "Waiting for DNS…"
      for _ in $(seq 60); do
        [[ -n "$(dig +short "${url#https://}" 2>/dev/null)" ]] && break
        sleep 2
      done
      echo "Public: $url/$PARAMS"
    ) &
  elif [[ $line == *" ERR "* ]]; then
    echo "$line"
  fi
done
