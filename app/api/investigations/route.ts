import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { config, isAllowlisted } from "@/lib/config";
import { memoryStore, useMemoryStore } from "@/lib/store";
import { prisma } from "@/lib/db/client";
import { authUser } from "@/lib/auth";
import { uploadScreenshot } from "@/lib/cloudinary/client";

function parseRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== "github.com") return null;
    const [owner, repo] = u.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

// Newest first, scoped to the caller. Summary fields only — detail via GET /:id.
const LIST_LIMIT = 50;

export async function GET(req: NextRequest) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;

  if (useMemoryStore()) {
    const items = memoryStore
      .list()
      .filter((inv) => inv.userId === auth.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, LIST_LIMIT)
      .map(({ id, repoUrl, owner, repo, description, stage, status, createdAt }) => ({
        id, repoUrl, owner, repo, description, stage, status, createdAt,
      }));
    return NextResponse.json({ items });
  }

  const items = await prisma.investigation.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
    select: {
      id: true, repoUrl: true, owner: true, repo: true, description: true,
      stage: true, status: true, createdAt: true, updatedAt: true,
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData();
  const repoUrl = String(form.get("repoUrl") ?? "");
  const description = String(form.get("description") ?? "");
  const expected = String(form.get("expected") ?? "");
  const actual = String(form.get("actual") ?? "");
  const steps = String(form.get("steps") ?? "");
  const environment = String(form.get("environment") ?? "");
  const errorText = String(form.get("errorText") ?? "");

  if (!repoUrl || !description) {
    return NextResponse.json({ error: "repoUrl and description are required" }, { status: 400 });
  }
  const parsed = parseRepo(repoUrl);
  if (!parsed) {
    return NextResponse.json({ error: "Only public github.com URLs accepted (INT-1)" }, { status: 400 });
  }
  if (!isAllowlisted(parsed.owner, parsed.repo)) {
    return NextResponse.json(
      { error: `Hosted demo investigates only: ${config.allowlist.join(", ")} (REPO-5)` },
      { status: 403 }
    );
  }

  const files = form.getAll("screenshots").filter((f) => f instanceof File) as File[];
  if (files.length > config.maxScreenshots) {
    return NextResponse.json({ error: `Max ${config.maxScreenshots} screenshots` }, { status: 400 });
  }
  for (const f of files) {
    if (!["image/png", "image/jpeg"].includes(f.type)) {
      return NextResponse.json({ error: `Only PNG/JPEG accepted, got ${f.type}` }, { status: 400 });
    }
    if (f.size > config.maxScreenshotBytes) {
      return NextResponse.json({ error: `${f.name} exceeds 5MB` }, { status: 400 });
    }
  }

  const id = `inv_${randomUUID().slice(0, 8)}`;
  const attachments: { publicId: string; secureUrl: string; mime: string; sizeBytes: number }[] = [];

  const cloudReady = config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret;
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    if (cloudReady) {
      try {
        const up = await uploadScreenshot(buf, id, f.name || "screenshot.png");
        attachments.push({ publicId: up.publicId, secureUrl: up.secureUrl, mime: f.type, sizeBytes: f.size });
      } catch (e) {
        return NextResponse.json({ error: `Cloudinary upload failed: ${e instanceof Error ? e.message : e}` }, { status: 502 });
      }
    } else {
      attachments.push({ publicId: `pending:${f.name}`, secureUrl: "", mime: f.type, sizeBytes: f.size });
    }
  }

  if (useMemoryStore()) {
    memoryStore.create({
      id, userId: auth.userId, repoUrl, owner: parsed.owner, repo: parsed.repo, description,
      expected, actual, steps, environment, errorText,
      stage: "intake", status: "pending", attachments, createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id, store: "memory", attachments: attachments.length, cloudinary: Boolean(cloudReady) }, { status: 201 });
  }

  const inv = await prisma.investigation.create({
    data: {
      id, userId: auth.userId, repoUrl, owner: parsed.owner, repo: parsed.repo, description,
      expected: expected || null, actual: actual || null, steps: steps || null,
      environment: environment || null, errorText: errorText || null,
      attachments: {
        create: attachments.filter((a) => !a.publicId.startsWith("pending:")).map((a) => ({ ...a })),
      },
    },
  });
  return NextResponse.json({ id: inv.id, store: "postgres", attachments: attachments.length }, { status: 201 });
}
