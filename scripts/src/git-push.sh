#!/usr/bin/env bash
# git-push.sh — push main to GitHub using GITHUB_PAT secret
set -euo pipefail

if [ -z "${GITHUB_PAT:-}" ]; then
  echo '{"level":"error","type":"git-push","msg":"GITHUB_PAT secret not set — skipping push"}'
  exit 1
fi

REMOTE="https://iamcalvin7:${GITHUB_PAT}@github.com/iamcalvin7/157Media-BrandHub.git"

OUTPUT=$(git push "$REMOTE" main 2>&1) || {
  echo "{\"level\":\"error\",\"type\":\"git-push\",\"msg\":\"Push failed\",\"output\":$(echo "$OUTPUT" | head -5 | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}"
  exit 1
}

echo "{\"level\":\"info\",\"type\":\"git-push\",\"msg\":\"Push complete\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
