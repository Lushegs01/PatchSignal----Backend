import { NextRequest, NextResponse } from "next/server";
import { getInvestigation } from "@/lib/investigations";
import { memoryStore, useMemoryStore } from "@/lib/store";
import { prisma } from "@/lib/db/client";
import { authUser, owns } from "@/lib/auth";
import { buildTestPath, vitestTemplate } from "@/lib/runner/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const inv = await getInvestigation(id);
  if (!owns(inv as { userId?: string | null }, auth.userId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const statement: string = body.statement ?? "Email validation may exclude the plus sign";
  const hypothesis = {
    statement,
    triggerConditions: body.triggerConditions ?? "Sign up with ade+test@gmail.com",
    expectedFailure: body.expectedFailure ?? "Form shows 'Invalid email address', expected account creation",
    evidenceNeeded: body.evidenceNeeded ?? "Vitest run failing with predicted assertion on target, passing on control",
    path: buildTestPath(id),
    content: vitestTemplate("src/validation/email", statement),
  };
  // HYP-4: reject imports absent from pinned tree (MVP: check test imports only known prefix)
  if (hypothesis.content.includes("from \"../../") && !hypothesis.content.includes("src/validation/email")) {
    return NextResponse.json({ error: "generated test imports unknown files (HYP-4)" }, { status: 400 });
  }
  if (useMemoryStore()) memoryStore.update(id, { hypothesis, stage: "hypothesized" });
  else {
    const h = await prisma.hypothesis.create({
      data: {
        investigationId: id, statement: hypothesis.statement,
        triggerConditions: hypothesis.triggerConditions, expectedFailure: hypothesis.expectedFailure,
        evidenceNeeded: hypothesis.evidenceNeeded,
      },
    });
    await prisma.testArtifact.create({
      data: { hypothesisId: h.id, path: hypothesis.path, content: hypothesis.content, framework: "vitest" },
    });
    await prisma.investigation.update({ where: { id }, data: { stage: "hypothesized" } });
  }
  return NextResponse.json(hypothesis, { status: 201 });
}
