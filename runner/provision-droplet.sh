#!/usr/bin/env bash
# Provision a fresh Ubuntu 22.04/24.04 Droplet as a PatchSignal runner host.
# Usage: sudo bash provision-droplet.sh <github-repo-url>
# Prints the generated RUNNER_TOKEN at the end — copy it into the backend env.
set -euo pipefail

REPO_URL="${1:?usage: sudo bash provision-droplet.sh <github-repo-url>}"

apt-get update
apt-get install -y ca-certificates curl gnupg ufw git

# Docker (official repo)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Node 24 (runs runner/src/server.ts directly — no build step)
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs

# App
mkdir -p /opt/patchsignal
if [ ! -d /opt/patchsignal/app/.git ]; then
  git clone "$REPO_URL" /opt/patchsignal/app
else
  git -C /opt/patchsignal/app pull --ff-only || true
fi

# Token (generated once, reused on re-runs)
if [ ! -f /opt/patchsignal/runner.env ]; then
  TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  printf 'RUNNER_TOKEN=%s\nRUNNER_PORT=5001\n' "$TOKEN" > /opt/patchsignal/runner.env
  chmod 600 /opt/patchsignal/runner.env
fi

# Service
cp /opt/patchsignal/app/runner/patchsignal-runner.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now patchsignal-runner

# Firewall: SSH always; 5001 open for the demo night (tighten after — see below)
ufw --force enable
ufw allow OpenSSH
ufw allow 5001/tcp || true

sleep 3
echo "--- runner health ---"
curl -s http://localhost:5001/health || echo "NOT UP — check: journalctl -u patchsignal-runner -n 30"
echo
echo "--- SAVE THIS into backend env (Render dashboard) ---"
grep RUNNER_TOKEN /opt/patchsignal/runner.env
echo "RUNNER_URL=http://$(curl -s ifconfig.me 2>/dev/null || echo '<droplet-ip>'):5001"
echo "--- tighten firewall to backend only (after it works) ---"
echo "ufw delete allow 5001/tcp && ufw allow from <backend-ip> to any port 5001 && systemctl restart patchsignal-runner"
