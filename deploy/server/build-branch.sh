#!/usr/bin/env bash
# Runs as bitrix (invoked via su - bitrix). Deploys one branch to the dev stand:
#   lock check -> backup bundle -> write lock -> git fetch/checkout/pull -> npm run build -> verify.
# Never runs as root; never touches prod (www), only ext_www/dev.likey.su.
set -euo pipefail

branch="${1:-}"

readonly TPL="/home/bitrix/ext_www/dev.likey.su/local/templates/aspro-allcorp2"
readonly RES="$TPL/resources"
readonly LOCK="$TPL/.dev-stand-lock"
readonly TS="$(date +%Y%m%d-%H%M%S)"

[ "$(whoami)" = "bitrix" ] || { echo "run only as bitrix" >&2; exit 1; }
[[ "$branch" =~ ^(dev|feature/[A-Za-z0-9._-]+|fix/[A-Za-z0-9._-]+)$ ]] || { echo "invalid branch: $branch" >&2; exit 1; }

cd "$RES"

# 1. Refuse to clobber a fresh (<3h) lock held by a different branch.
if [ -f "$LOCK" ] && [ -n "$(find "$LOCK" -mmin -180 2>/dev/null)" ]; then
  owner="$(head -1 "$LOCK" | cut -d'|' -f1 | tr -d ' ')"
  if [ "$owner" != "$branch" ]; then
    echo "dev-stand is locked by '$owner' (<3h). Not deploying '$branch'." >&2
    echo "release it with: ssh -i <ci-key> form-deploy@likey.su 'form-deploy release'" >&2
    exit 1
  fi
fi

# 2. Clean tree only (no git reset --hard, no git clean).
if [ -n "$(git status --porcelain)" ]; then
  echo "working tree is dirty; not deploying" >&2
  git status --short >&2
  exit 1
fi

# 3. Backup the current bundle before anything else; hash it for the smoke assert; rotate old .bak.
cp -p "$TPL/assets/js/application.js"  "$TPL/assets/js/application.js.$TS.bak"
cp -p "$TPL/assets/css/application.css" "$TPL/assets/css/application.css.$TS.bak"
js_before="$(sha256sum "$TPL/assets/js/application.js" | cut -d' ' -f1)"
css_before="$(sha256sum "$TPL/assets/css/application.css" | cut -d' ' -f1)"
ls -1t "$TPL/assets/js/application.js".*.bak  2>/dev/null | tail -n +6 | xargs -r rm -f
ls -1t "$TPL/assets/css/application.css".*.bak 2>/dev/null | tail -n +6 | xargs -r rm -f

# 4. Take the lock.
echo "$branch | form-deploy-ci | $(date -u +%FT%TZ)" > "$LOCK"

# 5. Checkout the branch and build (same sequence as the manual flow).
git fetch origin
git checkout "$branch"
git pull origin "$branch"
cd "$TPL"
npm run build

# 6. Prove the bundle was rebuilt (hash changed), not a silent no-op.
js_after="$(sha256sum "$TPL/assets/js/application.js" | cut -d' ' -f1)"
css_after="$(sha256sum "$TPL/assets/css/application.css" | cut -d' ' -f1)"
ls -la "$TPL/assets/js/application.js" "$TPL/assets/css/application.css"
if [ "$js_after" = "$js_before" ] && [ "$css_after" = "$css_before" ]; then
  echo "error: bundle unchanged after build (js/css hash identical)" >&2
  exit 1
fi
echo "deployed $branch @ $(git -C "$RES" rev-parse --short HEAD)"
