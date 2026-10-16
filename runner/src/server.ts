// Standalone runner: POST /jobs with Bearer RUNNER_TOKEN, Docker via execFile only.
// Holds NO app keys. One job at a time (v0.1): simple in-process mutex.
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";

const TOKEN = process.env.RUNNER_TOKEN ?? "";
const PORT = Number(process.env.RUNNER_PORT ?? 5001);
const ALLOWED = new Set(["vitest-json"]);
const TIMEOUT_MS = 120_000;

let busy = false;

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      const timedOut = (err as NodeJS.ErrnoException | null)?.code === "ETIMEDOUT" || (err as Error | null)?.message?.includes("ETIMEDOUT") === true;
      resolve({ code: typeof err?.code === "number" ? err.code : err ? 1 : 0, stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), timedOut });
    });
    void child;
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, busy }));
    return;
  }
  if (req.method !== "POST" || req.url !== "/jobs") {
    res.writeHead(404).end("not found");
    return;
  }
  if (req.headers.authorization !== `Bearer ${TOKEN}` || !TOKEN) {
    res.writeHead(401).end("unauthorized");
    return;
  }
  if (busy) {
    res.writeHead(429).end("runner busy (one job at a time in v0.1)");
    return;
  }
  let body = "";
  for await (const c of req) body += c;
  const spec = JSON.parse(body) as {
    jobId: string; image: string; command: string; timeoutSec: number;
    files: { path: string; content: string }[]; repo: { sha: string };
  };
  if (!ALLOWED.has(spec.command)) {
    res.writeHead(400).end("command not allowlisted");
    return;
  }
  busy = true;
  const started = Date.now();
  try {
    const name = `ps_${randomUUID().slice(0, 8)}`;
    // Write test files into image via a throwaway writer container is out of scope for
    // tonight's minimal runner: image must already contain repo at SHA; files are
    // mounted read-only from pre-staged host dir by orchestrator in full deploy.
    // Here we run the pinned image with the allowlisted command.
    const vitestCmd = "npx vitest run --reporter=json";
    const args = [
      "run", "--rm", "--name", name,
      "--network", "none",
      "--user", "65532:65532",
      "--cap-drop", "ALL",
      "--cpus", "1",
      "--memory", "1024m",
      "--pids-limit", "256",
      spec.image,
      "sh", "-c", vitestCmd,
    ];
    const timeoutMs = Math.min((spec.timeoutSec || 120) * 1000, TIMEOUT_MS);
    const { code, stdout, stderr, timedOut } = await run("docker", args, timeoutMs + 5000);
    const durationMs = Date.now() - started;
    const outcome = timedOut ? "timeout" : code === 0 ? "passed" : code > 0 && code < 125 ? "failed" : "error";
    const trunc = (s: string) => (s.length > 8000 ? s.slice(0, 8000) + "\n…[truncated]" : s);
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        jobId: spec.jobId, exitCode: code, durationMs, outcome,
        reportJson: "", stdout: trunc(stdout), stderr: trunc(stderr),
        imageDigest: spec.image.split("@")[1] ?? "", truncated: stdout.length > 8000 || stderr.length > 8000,
      })
    );
  } catch (e) {
    res.writeHead(500).end(e instanceof Error ? e.message : "runner error");
  } finally {
    busy = false;
  }
});

server.listen(PORT, () => console.log(`[runner] listening :${PORT}`));
