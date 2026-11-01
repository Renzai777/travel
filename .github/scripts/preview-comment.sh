#!/usr/bin/env bash
# Post (or update) one sticky PR comment with the Cloudflare preview URLs found in a `cf previews deploy` log.
# Usage: preview-comment.sh <preview.log>
# Env: GH_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA. Set DRY_RUN=1 to print the comment instead of posting it.
set -euo pipefail

log="${1:?usage: preview-comment.sh <preview.log>}"
marker="<!-- cloudflare-preview -->"

mapfile -t urls < <(grep -Eo 'https://[A-Za-z0-9.-]+\.workers\.dev' "$log" | sort -u || true)
if [ "${#urls[@]}" -eq 0 ]; then
  echo "No preview URL found in $log" >&2
  exit 1
fi

branch_rows=""
commit_rows=""
for url in "${urls[@]}"; do
  # Version URLs start with an 8-hex-digit version prefix; the other one is the stable branch alias.
  if [[ "$url" =~ ^https://[0-9a-f]{8}- ]]; then
    commit_rows+="| This commit | ${url} |"$'\n'
  else
    branch_rows+="| Branch (always latest) | ${url} |"$'\n'
  fi
done
rows="${branch_rows}${commit_rows}"

body="${marker}
### Cloudflare preview

| | URL |
| --- | --- |
${rows}
Built from \`${HEAD_SHA:0:7}\`. This comment updates on every push."

if [ "${DRY_RUN:-0}" = "1" ]; then
  printf '%s\n' "$body"
  exit 0
fi

existing=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" --paginate \
  --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | startswith(\"${marker}\"))) | .id" | head -n 1)

if [ -n "$existing" ]; then
  gh api -X PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${existing}" -f body="$body" >/dev/null
  echo "Updated preview comment ${existing}"
else
  gh api -X POST "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" -f body="$body" >/dev/null
  echo "Posted preview comment"
fi
