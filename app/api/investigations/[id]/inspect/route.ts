import { NextResponse } from "next/server";
import { getInvestigation } from "@/lib/investigations";
import { memoryStore, useMemoryStore } from "@/lib/store";
import { prisma } from "@/lib/db/client";
import { authUser, owns } from "@/lib/auth";
import { inspectRepo } from "@/lib/github/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const inv = (await getInvestigation(id)) as unknown as {
    id: string; userId?: string | null; owner: string; repo: string;
  } | null;
  if (!inv || !owns(inv, auth.userId)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const inspection = await inspectRepo(inv.owner, inv.repo);
    if (useMemoryStore()) {
      memoryStore.update(id, {
        inspection, commitSha: inspection.sha,
        controlSha: process.env.CONTROL_SHA || undefined, stage: "inspected",
      });
    } else {
      await prisma.investigation.update({
        where: { id },
        data: { commitSha: inspection.sha, controlSha: process.env.CONTROL_SHA || null, stage: "inspected" },
      });
    }
    return NextResponse.json(inspection);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "inspect failed" }, { status: 502 });
  }
}
