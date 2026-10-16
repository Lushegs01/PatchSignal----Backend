import { NextResponse } from "next/server";
import { getInvestigation } from "@/lib/investigations";
import { authUser, owns } from "@/lib/auth";

function md(inv: Record<string, unknown>): string {
  const get = (k: string) => String((inv[k] as string | undefined) ?? "");
  const ev = inv.evidence as { summary?: string } | undefined;
  const cls = inv.classification as { status?: string; justification?: string } | undefined;
  return [
    `# PatchSignal evidence package — ${get("id")}`,
    ``,
    `## Summary`,
    `${ev?.summary ?? get("description")}`,
    ``,
    `## Status: ${cls?.status ?? get("status")}`,
    `${cls?.justification ?? ""}`,
    ``,
    `## Expected vs actual`,
    `- Expected: ${get("expected") || "(Unknown — ask reporter)"}`,
    `- Actual: ${get("actual") || "(see evidence)"}`,
    ``,
    `## Revision`,
    `- repo: ${get("repoUrl")} @ ${get("commitSha") || "unpinned"}`,
    `- control: ${get("controlSha") || "none"}`,
    ``,
    `> Not reproduced does not prove absence. Inconclusive means setup/timeout/unsupported — never file as proven.`,
    ``,
    `## Next steps`,
    `- Maintainer reviews, edits, then files manually via the prefilled link below.`,
  ].join("\n");
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const inv = (await getInvestigation(id)) as unknown as Record<string, unknown> | null;
  if (!inv || !owns(inv, auth.userId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const markdown = md(inv);
  const title = encodeURIComponent(`[PatchSignal] ${(inv.evidence as { summary?: string } | undefined)?.summary ?? "bug report"}`);
  const body = encodeURIComponent(markdown.slice(0, 7000));
  const issueUrl = `https://github.com/${inv.owner}/${inv.repo}/issues/new?title=${title}&body=${body}`;
  const tooLong = markdown.length > 7000;
  return NextResponse.json({ markdown, issueUrl, copyToClipboard: tooLong });
}
