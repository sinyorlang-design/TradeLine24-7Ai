#!/usr/bin/env bash
set -euo pipefail

# TL247: add 'origin' if missing, push current branch with upstream, verify HEAD matches remote (idempotent)

git rev-parse --show-toplevel >/dev/null
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
HEAD_SHA="$(git rev-parse HEAD)"
echo "Local: $BRANCH @ $HEAD_SHA"

if ! git remote | grep -qx origin; then
  if command -v gh >/dev/null 2>&1; then
    REPO_NAME="$(basename "$(git rev-parse --show-toplevel)")"
    echo "No origin; creating GitHub repo '$REPO_NAME' and wiring remote…"
    gh repo create "$REPO_NAME" --private --source . --remote origin --push
  else
    echo "No origin and no GitHub CLI. Add a remote then push:"
    echo "  git remote add origin <git@github.com:OWNER/REPO.git>"
    echo "  git push -u origin \"$BRANCH\""
    exit 2
  fi
else
  git push -u origin "$BRANCH"
fi

git fetch -q origin
git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
test "$REMOTE_SHA" = "$HEAD_SHA" && echo "✅ PUSHED: origin/$BRANCH @ $REMOTE_SHA" || { echo "❌ mismatch"; exit 4; }
