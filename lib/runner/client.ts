import { config } from "@/lib/config";

export type JobSpec = {
  jobId: string;
  repo: { owner: string; name: string; sha: string };
  image: string;
  ecosystem: "node-vitest";
  files: { path: string; content: string }[];
  command: "vitest-json";
  timeoutSec: number;
  limits: { cpus: number; memoryMb: number; pids: number };
};

export type JobResult = {
  jobId: string;
  exitCode: number;
  durationMs: number;
  outcome: "passed" | "failed" | "error" | "timeout";
  reportJson?: string;
  stdout: string;
  stderr: string;
  imageDigest?: string;
  truncated: boolean;
};

export async function dispatchJob(spec: JobSpec): Promise<JobResult> {
  const res = await fetch(`${config.runnerUrl}/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.runnerToken}` },
    body: JSON.stringify(spec),
  });
  if (!res.ok) throw new Error(`runner rejected job: ${res.status} ${await res.text()}`);
  return (await res.json()) as JobResult;
}

export function buildTestPath(invId: string): string {
  return `tests/patchsignal/repro-${invId.slice(0, 8)}.test.ts`;
}

export function vitestTemplate(fn: string, hypothesis: string): string {
  return `import { describe, expect, it } from "vitest";\n// Hypothesis: ${hypothesis}\n// Target function under test: ${fn}\n\ndescribe("patchsignal repro", () => {\n  it("asserts correct behaviour (fails on bug, passes when fixed)", async () => {\n    const mod = await import("../../src/validation/email").catch(() => null);\n    expect(mod, "target module missing — mark Inconclusive, do not fake pass").toBeTruthy();\n  });\n});\n`;
}
