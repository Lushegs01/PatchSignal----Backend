import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getInvestigation, saveClassification } from "@/lib/investigations";
import { memoryStore, useMemoryStore } from "@/lib/store";
import { prisma } from "@/lib/db/client";
import { authUser, owns } from "@/lib/auth";
import { classify } from "@/lib/classify/rules";
import { buildTestPath, dispatchJob } from "@/lib/runner/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const inv = (await getInvestigation(id)) as unknown as {
    id: string; userId?: string | null; owner: string; repo: string; commitSha?: string; controlSha?: string;
    hypothesis?: { path: string; content: string };
  } | null;
  if (!inv || !owns(inv, auth.userId)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  // Allow direct result injection for testing without Docker (honest: caller records source).
  if (body.target && !config.runnerToken) {
    const { status, rule, justification } = classify(body.target, body.control ?? null);
    if (useMemoryStore()) memoryStore.update(id, { runs: body, classification: { status, rule, justification }, status, stage: "ran" });
    else await saveClassification(id, status, rule, justification);
    return NextResponse.json({ status, rule, justification, injected: true });
  }
  try {
    const testPath = inv.hypothesis?.path ?? buildTestPath(id);
    const content = inv.hypothesis?.content ?? "";
    const image = body.image as string;
    if (!image) return NextResponse.json({ error: "image (pinned image@digest) required" }, { status: 400 });
    const base = {
      ecosystem: "node-vitest" as const, command: "vitest-json" as const,
      timeoutSec: 120, limits: { cpus: 1, memoryMb: 1024, pids: 256 },
      files: [{ path: testPath, content }],
    };
    const target = await dispatchJob({
      ...base, jobId: `${id}-target`,
      repo: { owner: inv.owner, name: inv.repo, sha: inv.commitSha ?? "HEAD" }, image,
    });
    let control: unknown = null;
    if (inv.controlSha && body.controlImage) {
      control = await dispatchJob({
        ...base, jobId: `${id}-control`,
        repo: { owner: inv.owner, name: inv.repo, sha: inv.controlSha }, image: body.controlImage,
      });
    }
    const t = target as { outcome: "passed" | "failed" | "error" | "timeout"; exitCode: number; stdout: string };
    const predicted = /invalid email|assertion|expected/i.test(t.stdout + JSON.stringify(body.expected ?? ""));
    const unrelated = t.outcome === "error" || /Cannot find module|SyntaxError|ECONNREFUSED|ENOTFOUND/i.test(t.stdout);
    const c = control as { outcome: "passed" | "failed" | "error" | "timeout"; exitCode: number } | null;
    const { status, rule, justification } = classify(
      { role: "target", outcome: t.outcome, exitCode: t.exitCode, predictedAssertionFailed: predicted, unrelatedFailure: unrelated },
      c ? { role: "control", outcome: c.outcome, exitCode: c.exitCode, predictedAssertionFailed: false, unrelatedFailure: c.outcome === "error" } : null
    );
    if (useMemoryStore()) memoryStore.update(id, { runs: { target, control }, classification: { status, rule, justification }, status, stage: "ran" });
    else {
      const hyp = await prisma.hypothesis.findFirst({ where: { investigationId: id } });
      if (hyp) {
        await prisma.run.create({
          data: {
            hypothesisId: hyp.id, role: "target", revisionSha: inv.commitSha, imageDigest: image.split("@")[1] ?? "",
            command: "vitest-json", exitCode: t.exitCode, outcome: t.outcome,
            stdout: t.stdout.slice(0, 8000), truncated: t.stdout.length > 8000,
          },
        });
      }
      await saveClassification(id, status, rule, justification);
    }
    return NextResponse.json({ target, control, status, rule, justification });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "run failed" }, { status: 502 });
  }
}
