#!/usr/bin/env bash
# Idempotent server setup for the site_form CI deploy (deploy/README.md).
# Run as root on likey.su AFTER copying deploy/ to /tmp/site-form-deploy/deploy.
# Creates the form-deploy user, installs the gate/wrapper/build script/sudoers, and the CI pub key.
# Re-running is safe; never overwrites an existing authorized_keys entry without the pub key file.
set -euo pipefail
export LC_ALL=C

SRC="$(dirname "$0")"
TPL="/home/bitrix/ext_www/dev.likey.su/local/templates/aspro-allcorp2"

# 1. Deploy user (no password, no shell).
if ! id form-deploy >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/form-deploy --shell /usr/sbin/nologin form-deploy
fi
install -d -m 0700 -o form-deploy -g form-deploy /var/lib/form-deploy/.ssh

# 2. Scripts.
install -m 0755 "$SRC/form-deploy-gate" /usr/local/sbin/form-deploy-gate
install -m 0755 "$SRC/form-deploy"      /usr/local/sbin/form-deploy
install -m 0755 "$SRC/build-branch.sh"  "$TPL/build-branch.sh"
chown bitrix:bitrix "$TPL/build-branch.sh"

# 3. sudoers (validate before installing).
visudo -cf "$SRC/../sudoers/form-deploy"
install -m 0440 "$SRC/../sudoers/form-deploy" /etc/sudoers.d/form-deploy
visudo -c

# 4. Authorized key (from deploy/ssh/form-deploy.pub, added by the admin in step 1).
PUB="$SRC/../ssh/form-deploy.pub"
if [ -s "$PUB" ]; then
  install -m 0600 -o form-deploy -g form-deploy "$PUB" /var/lib/form-deploy/.ssh/authorized_keys
else
  echo "warning: $PUB is empty or missing; add the CI pub key manually" >&2
fi

echo "setup done. journal: journalctl -t form-deploy-gate"
