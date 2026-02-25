#!/usr/bin/env zsh
set -euo pipefail

# Usage:
#   ./deploy.sh <short-branch-name> [commit message...]
#
# Example:
#   ./deploy.sh stock-movement "Stock movement UI & service wiring"

if [[ -z "${1:-}" ]]; then
  echo "Usage: $0 <short-branch-name> [commit message...]"
  exit 1
fi

SHORT_BRANCH="$1"
shift
BRANCH="feature/${SHORT_BRANCH}"

if [[ $# -gt 0 ]]; then
  COMMIT_MSG="$*"
else
  COMMIT_MSG="Work on ${BRANCH}"
fi

# Ensure we're in a git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not inside a git repository."
  exit 1
fi

STASHED=0

# Detect dirty working tree (tracked or staged changes)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "→ Dirty working tree detected. Auto-stashing..."
  git stash push -u -m "auto-stash before ${BRANCH}"
  STASHED=1
fi

echo "→ Switching to main..."
if git switch main 2>/dev/null; then
  :
else
  git checkout main
fi

echo "→ Pulling latest from origin/main..."
git pull origin main

echo "→ Creating / switching to branch: ${BRANCH}"
if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  git switch "${BRANCH}" 2>/dev/null || git checkout "${BRANCH}"
else
  git switch -c "${BRANCH}" 2>/dev/null || git checkout -b "${BRANCH}"
fi

if [[ "${STASHED}" -eq 1 ]]; then
  echo "→ Restoring stashed changes..."
  if ! git stash pop; then
    echo "Error: stash pop resulted in conflicts. Resolve them manually."
    exit 1
  fi
fi

echo "→ Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "→ No staged changes to commit. Skipping commit & push."
else
  echo "→ Committing with message: ${COMMIT_MSG}"
  git commit -m "${COMMIT_MSG}"

  echo "→ Pushing to origin/${BRANCH}..."
  git push -u origin "${BRANCH}"
fi

echo "→ Returning to main..."
if git switch main 2>/dev/null; then
  :
else
  git checkout main
fi

# Best-effort update of local main; don't fail script if pull fails
git pull origin main || true

echo "✓ Done."
echo "  Branch: ${BRANCH}"
echo "  Commit: ${COMMIT_MSG}"
echo "  Current branch: main"
