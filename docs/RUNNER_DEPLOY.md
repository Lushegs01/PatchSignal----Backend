# Runner deploy guide (Docker host — NOT Render)

The runner is pure Node stdlib (`runner/src/server.ts`, no npm deps needed at
runtime; Node 24 runs the .ts directly). It needs: Docker Engine, the
prebuilt demo images, `RUNNER_TOKEN`, `RUNNER_PORT`.

## Option A — tonight: this laptop + ngrok (fastest)

```powershell
$env:RUNNER_TOKEN="<same value as backend .env>"
$env:RUNNER_PORT="5001"
node runner/src/server.ts
# new terminal:
ngrok http 5001
```

Set backend `RUNNER_URL=https://<you>.ngrok-free.app` (local `.env`, restart
`npm run dev`; prod: Render dashboard env). Ngrok URL changes per restart on
free tier — update `RUNNER_URL` when it does.

## Option B — prod: Ubuntu Droplet with Docker (one-shot script)

```bash
# on the fresh Droplet (Ubuntu 22.04/24.04, root or sudo user):
curl -sSL https://raw.githubusercontent.com/Oriolowo-Mustapha/PatchSignal----Backend/main/runner/provision-droplet.sh -o provision.sh
# or: copy runner/provision-droplet.sh up with scp
sudo bash provision.sh https://github.com/Oriolowo-Mustapha/PatchSignal----Backend.git
# script installs Docker + Node 24, clones the repo, generates RUNNER_TOKEN,
# enables the systemd service, opens the firewall, and PRINTS the token +
# RUNNER_URL to save into the backend env (Render dashboard).
```

Verify: `curl http://<droplet-ip>:5001/health` → `{"ok":true,"busy":false}`.
Logs: `journalctl -u patchsignal-runner -n 50`. Restart after pulls:
`git -C /opt/patchsignal/app pull && sudo systemctl restart patchsignal-runner`.

Manual alternative (no script) — reference:

```bash
# 1. Docker
sudo apt update && sudo apt install -y docker.io
sudo usermod -aG docker $USER  # re-login after

# 2. Code (needs only the runner file + node)
git clone https://github.com/Oriolowo-Mustapha/PatchSignal----Backend.git
cd PatchSignal----Backend

# 3. Service: see runner/patchsignal-runner.service + /opt/patchsignal/runner.env
#    (RUNNER_TOKEN=<fresh>, RUNNER_PORT=5001), then:
sudo cp runner/patchsignal-runner.service /etc/systemd/system/
sudo systemctl enable --now patchsignal-runner

# 4. Firewall: allow ONLY the backend host, not the world
sudo ufw allow from <backend-ip> to any port 5001
# or: sudo ufw allow 5001   (demo-night shortcut; rotate token after)
```

`RUNNER_URL=http://<droplet-ip>:5001` in the backend env.

## Demo images (run on the runner host, inside the demo repo, once per revision)

```bash
docker build -t demo-signup:target .
docker build -t demo-signup:control .   # from the fixed branch
docker image inspect demo-signup:target --format='{{.RepoDigests}}'
# pass "demo-signup@sha256:<digest>" as `image` in /runs calls
```

## Image contract (demo repo owner)

- Repo checked out at `/repo`, `node_modules` installed at build (`npm ci`)
- `vitest` in devDependencies; default include picks up `tests/patchsignal/*.test.ts`
- Generated test imports `../../src/validation/email` → keep that module path
  or update `lib/runner/client.ts` `vitestTemplate()` to match
- Build with `docker/demo-signup/Dockerfile` as reference (non-root user
  `65532`, deps at build, never at run)

## Notes

- One job at a time in v0.1 (`429 runner busy` otherwise); free token slot
  doubles as the honest-inject switch — with `RUNNER_TOKEN` set, `/runs`
  requires real Docker jobs.
- Rotate `RUNNER_TOKEN` after any demo over plain HTTP.
