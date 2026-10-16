import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { hashPassword, normalizeEmail } from "@/lib/auth";
import { classify, type ClassifiableRun, type RunOutcome } from "@/lib/classify/rules";
import { cloudinaryClient } from "@/lib/cloudinary/client";
import { config } from "@/lib/config";
import captured from "@/lib/demo/captured.json";
import { DEMO_OWNER, demoScenarios, type DemoScenario } from "@/lib/demo/scenarios";

// Seeds a demo account with investigations covering every stage and verdict.
// Idempotent: seeded IDs are replaced on each run, so re-running resets the demo.
// Used by `npm run db:seed` and POST /api/demo/seed.

export const DEMO_DEFAULTS = {
  email: "demo@patchsignal.dev",
  password: "patchsignal-demo-2026",
  name: "Demo Maintainer",
} as const;

type CapturedRun = { exitCode: number; durationMs: number; outcome: RunOutcome; stdout: string; stderr: string };
type VitestReport = {
  testResults?: { message?: string; assertionResults?: { failureMessages?: string[] }[] }[];
};

const runs = captured.runs as Record<string, CapturedRun>;
const tests = captured.tests as Record<string, { path: string; content: string }>;
const MINUTE = 60_000;

export type SeedOptions = {
  email?: string;
  password?: string;
  name?: string;
  /** Also delete every other investigation owned by the demo account. */
  reset?: boolean;
  now?: Date;
};

export type SeedResult = {
  email: string;
  userId: string;
  removed: number;
  screenshots: "cloudinary" | "skipped";
  investigations: { id: string; repo: string; stage: string; status: string; rule?: string }[];
  warnings: string[];
};

// Deterministic, realistic-looking commit SHAs for the fictional demo repos.
function sha(label: string): string {
  return createHash("sha1").update(label).digest("hex");
}

// Signals for classify(), read from the parsed Vitest JSON report: a predicted
// failure is an AssertionError; a suite-level error (module failed to load)
// or a failure without an assertion is unrelated to the hypothesis.
export function runSignals(role: "target" | "control", run: CapturedRun): ClassifiableRun {
  let report: VitestReport | null = null;
  try {
    report = JSON.parse(run.stdout) as VitestReport;
  } catch {
    report = null;
  }
  const files = report?.testResults ?? [];
  const assertionFailed = files.some((f) =>
    (f.assertionResults ?? []).some((a) => (a.failureMessages ?? []).some((m) => m.startsWith("AssertionError")))
  );
  const loadError = files.some((f) => Boolean(f.message));
  return {
    role,
    outcome: run.outcome,
    exitCode: run.exitCode,
    predictedAssertionFailed: role === "target" && assertionFailed,
    unrelatedFailure: run.outcome === "error" || loadError || (run.outcome === "failed" && !assertionFailed),
  };
}

function capturedRun(id: string, role: "target" | "control"): CapturedRun {
  const run = runs[`${id}:${role}`];
  if (!run) throw new Error(`No captured ${role} run for ${id}`);
  return run;
}

export function verdictFor(s: DemoScenario) {
  if (!s.runs?.includes("target")) return null;
  const target = runSignals("target", capturedRun(s.id, "target"));
  const control = s.runs.includes("control") ? runSignals("control", capturedRun(s.id, "control")) : null;
  return classify(target, control);
}

type Upload = { publicId: string; secureUrl: string; mime: string; sizeBytes: number; width?: number; height?: number };

async function uploadScreenshots(names: string[], warnings: string[]): Promise<Map<string, Upload> | null> {
  const { cloudName, apiKey, apiSecret, folder } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    warnings.push("Cloudinary is not configured; screenshots were not attached.");
    return null;
  }
  const uploads = new Map<string, Upload>();
  try {
    for (const name of names) {
      const buf = await readFile(join(process.cwd(), "lib/demo/screenshots", name));
      // Fixed public ID + overwrite keeps re-seeding idempotent on Cloudinary too.
      const publicId = `${folder}/demo-seed/${name.replace(/\.png$/, "")}`;
      const res = await new Promise<{ secure_url: string; public_id: string; width?: number; height?: number; bytes?: number }>(
        (resolve, reject) => {
          const stream = cloudinaryClient().uploader.upload_stream(
            { public_id: publicId, resource_type: "image", overwrite: true, invalidate: true },
            (err, result) => (err ? reject(err) : resolve(result as never))
          );
          stream.end(buf);
        }
      );
      uploads.set(name, {
        publicId: res.public_id, secureUrl: res.secure_url, mime: "image/png",
        sizeBytes: res.bytes ?? buf.length, width: res.width, height: res.height,
      });
    }
  } catch (e) {
    warnings.push(`Screenshot upload failed; screenshots were not attached (${e instanceof Error ? e.message : String(e)}).`);
    return null;
  }
  return uploads;
}

export async function seedDemo(prisma: PrismaClient, opts: SeedOptions = {}): Promise<SeedResult> {
  const email = normalizeEmail(opts.email || DEMO_DEFAULTS.email);
  const password = opts.password || DEMO_DEFAULTS.password;
  if (password.length < 8) throw new Error("Demo password must be at least 8 characters.");
  const name = opts.name || DEMO_DEFAULTS.name;
  const now = (opts.now ?? new Date()).getTime();
  const warnings: string[] = [];

  const screenshotNames = demoScenarios.flatMap((s) => (s.screenshot ? [s.screenshot] : []));
  const uploads = await uploadScreenshots(screenshotNames, warnings);
  const passwordHash = await hashPassword(password);
  const ids = demoScenarios.map((s) => s.id);

  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: { passwordHash, name },
        create: { email, passwordHash, name },
      });
      const { count: removed } = await tx.investigation.deleteMany({
        where: opts.reset ? { OR: [{ userId: user.id }, { id: { in: ids } }] } : { id: { in: ids } },
      });

      const investigations: SeedResult["investigations"] = [];
      for (const s of demoScenarios) {
        const createdAt = new Date(now - s.ageMinutes * MINUTE);
        const at = (minutes: number) => new Date(createdAt.getTime() + minutes * MINUTE);
        const commitSha = s.pinned ? sha(`${DEMO_OWNER}/${s.repo}@target`) : null;
        const controlSha = s.pinned?.control ? sha(`${DEMO_OWNER}/${s.repo}@control`) : null;
        const verdict = verdictFor(s);
        const test = s.hypothesis?.test ?? tests[s.id];
        if (s.hypothesis && !test) throw new Error(`No test source for ${s.id}`);
        const stage = verdict ? "packaged" : s.hypothesis ? "hypothesized" : s.pinned ? "inspected" : s.evidence ? "analyzed" : "intake";
        const status = verdict?.status ?? "pending";
        const upload = s.screenshot ? uploads?.get(s.screenshot) : undefined;
        const runRows = (s.runs ?? []).map((role, index) => {
          const run = capturedRun(s.id, role);
          return {
            role, revisionSha: role === "target" ? commitSha : controlSha, imageDigest: null,
            command: "vitest-json", exitCode: run.exitCode, outcome: run.outcome, durationMs: run.durationMs,
            stdout: run.stdout.slice(0, 8000), stderr: run.stderr.slice(0, 8000),
            truncated: run.stdout.length > 8000 || run.stderr.length > 8000,
            createdAt: at(6 + index * 2),
          };
        });
        const lastEvent = verdict ? at(7 + runRows.length) : s.hypothesis ? at(4) : s.pinned ? at(2) : s.evidence ? at(1) : createdAt;

        await tx.investigation.create({
          data: {
            id: s.id, userId: user.id, repoUrl: `https://github.com/${DEMO_OWNER}/${s.repo}`,
            owner: DEMO_OWNER, repo: s.repo, description: s.description,
            expected: s.expected ?? null, actual: s.actual ?? null, steps: s.steps ?? null,
            environment: s.environment ?? null, errorText: s.errorText ?? null,
            commitSha, controlSha, stage, status, modelId: s.evidence ? "demo-seed" : null,
            createdAt, updatedAt: lastEvent,
            attachments: upload ? { create: [{ ...upload, createdAt }] } : undefined,
            evidence: s.evidence ? { create: s.evidence.map((e) => ({ ...e, createdAt: at(1) })) } : undefined,
            questions: s.questions
              ? { create: s.questions.map((q) => ({ text: q.text, blocking: q.blocking ?? false })) }
              : undefined,
            hypotheses: s.hypothesis && test
              ? {
                  create: [{
                    statement: s.hypothesis.statement, triggerConditions: s.hypothesis.triggerConditions,
                    expectedFailure: s.hypothesis.expectedFailure, evidenceNeeded: s.hypothesis.evidenceNeeded,
                    tests: { create: [{ path: test.path, content: test.content, framework: "vitest" }] },
                    runs: runRows.length ? { create: runRows } : undefined,
                  }],
                }
              : undefined,
            classifications: verdict
              ? { create: [{ status: verdict.status, rule: verdict.rule, justification: verdict.justification, decidedAt: lastEvent }] }
              : undefined,
          },
        });
        investigations.push({ id: s.id, repo: `${DEMO_OWNER}/${s.repo}`, stage, status, rule: verdict?.rule });
      }

      return {
        email, userId: user.id, removed,
        screenshots: uploads ? "cloudinary" : "skipped",
        investigations, warnings,
      } satisfies SeedResult;
    },
    { timeout: 60_000, maxWait: 10_000 }
  );
}
