import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getInvestigation } from "@/lib/investigations";
import { memoryStore, useMemoryStore } from "@/lib/store";
import { prisma } from "@/lib/db/client";
import { authUser, owns } from "@/lib/auth";
import { cachedDemoEvidence, extractEvidence } from "@/lib/gemma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const inv = (await getInvestigation(id)) as unknown as {
    id: string; userId?: string | null; description: string; expected?: string; actual?: string;
    steps?: string; environment?: string; errorText?: string;
  } | null;
  if (!inv || !owns(inv, auth.userId)) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!config.geminiApiKey) {
    // Honest cached fallback, labelled — demo can proceed without key.
    const evidence = { ...cachedDemoEvidence(), _cached: true };
    if (useMemoryStore()) memoryStore.update(id, { evidence, stage: "analyzed" });
    else {
      await prisma.evidenceItem.createMany({
        data: evidence.evidence.map((e) => ({
          investigationId: id, text: e.text,
          provenance: e.provenance as "observed" | "reported" | "hypothesis",
          source: e.source,
        })),
      });
      await prisma.investigation.update({ where: { id }, data: { stage: "analyzed", modelId: "cached-demo", status: "pending" } });
    }
    return NextResponse.json({ ...evidence, cached: true });
  }

  try {
    const { evidence, modelId } = await extractEvidence({
      description: inv.description,
      fields: {
        expected: inv.expected ?? "", actual: inv.actual ?? "", steps: inv.steps ?? "",
        environment: inv.environment ?? "", error: inv.errorText ?? "",
      },
      imageParts: [],
    });
    if (useMemoryStore()) memoryStore.update(id, { evidence, stage: "analyzed" });
    else {
      await prisma.evidenceItem.createMany({
        data: evidence.evidence.map((e) => ({ investigationId: id, text: e.text, provenance: e.provenance, source: e.source })),
      });
      await prisma.question.createMany({
        data: evidence.unknowns.map((u) => ({ investigationId: id, text: u.question, blocking: u.blocking })),
      });
      await prisma.investigation.update({ where: { id }, data: { stage: "analyzed", modelId, status: "pending" } });
    }
    return NextResponse.json({ ...evidence, modelId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "extract failed" }, { status: 502 });
  }
}
