import { NextResponse } from "next/server";
import { getInvestigation } from "@/lib/investigations";
import { authUser, owns } from "@/lib/auth";

type Row = Record<string, unknown>;
type EvidenceRow = { text?: string; provenance?: string; source?: string };
type QuestionRow = { text?: string; question?: string; blocking?: boolean };
type RunRow = { role?: string; outcome?: string; exitCode?: number | null; durationMs?: number | null; revisionSha?: string | null; command?: string; createdAt?: unknown };

const time = (v: unknown) => new Date(String(v ?? 0)).getTime() || 0;

// Memory store keeps one `classification`; Postgres keeps `classifications[]`.
function classificationOf(inv: Row): { status?: string; justification?: string; rule?: string } | undefined {
  if (inv.classification) return inv.classification as { status?: string; justification?: string; rule?: string };
  const rows = (inv.classifications as Row[] | undefined) ?? [];
  return [...rows].sort((a, b) => time(a.decidedAt) - time(b.decidedAt)).at(-1) as { status?: string; justification?: string; rule?: string } | undefined;
}

function evidenceOf(inv: Row): { items: EvidenceRow[]; questions: QuestionRow[] } {
  if (Array.isArray(inv.evidence)) {
    return { items: inv.evidence as EvidenceRow[], questions: (inv.questions as QuestionRow[] | undefined) ?? [] };
  }
  const ev = (inv.evidence ?? {}) as { evidence?: EvidenceRow[]; unknowns?: QuestionRow[] };
  return { items: ev.evidence ?? [], questions: ev.unknowns ?? [] };
}

// Latest target and control run (Postgres: hypotheses[].runs[]; memory: runs.{target,control}).
function runsOf(inv: Row): RunRow[] {
  const hyps = (inv.hypotheses as { runs?: RunRow[] }[] | undefined) ?? [];
  const rows = hyps.flatMap((h) => h.runs ?? []);
  if (!rows.length && inv.runs && typeof inv.runs === "object") {
    const r = inv.runs as { target?: RunRow; control?: RunRow };
    return [r.target && { ...r.target, role: "target" }, r.control && { ...r.control, role: "control" }].filter(Boolean) as RunRow[];
  }
  return ["target", "control"].flatMap((role) => {
    const latest = rows.filter((r) => r.role === role).sort((a, b) => time(a.createdAt) - time(b.createdAt)).at(-1);
    return latest ? [latest] : [];
  });
}

function md(inv: Row): string {
  const get = (k: string) => String((inv[k] as string | undefined) ?? "");
  const ev = inv.evidence as { summary?: string } | undefined;
  const cls = classificationOf(inv);
  const { items, questions } = evidenceOf(inv);
  const runs = runsOf(inv);
  return [
    `# PatchSignal evidence package — ${get("id")}`,
    ``,
    `## Summary`,
    `${ev?.summary ?? get("description")}`,
    ``,
    `## Status: ${cls?.status ?? get("status")}`,
    `${cls?.justification ?? ""}${cls?.rule ? ` (rule ${cls.rule})` : ""}`,
    ``,
    `## Expected vs actual`,
    `- Expected: ${get("expected") || "(Unknown — ask reporter)"}`,
    `- Actual: ${get("actual") || "(see evidence)"}`,
    ...(items.length ? [``, `## Evidence`, ...items.map((e) => `- [${e.provenance}] ${e.text}${e.source ? ` (${e.source})` : ""}`)] : []),
    ...(questions.length
      ? [``, `## Open questions`, ...questions.map((q) => `- ${q.blocking ? "(blocking) " : ""}${q.question ?? q.text}`)]
      : []),
    ...(runs.length
      ? [``, `## Execution`, ...runs.map((r) =>
          `- ${r.role}: ${r.outcome}, exit ${r.exitCode ?? "?"}${r.durationMs != null ? `, ${(r.durationMs / 1000).toFixed(2)}s` : ""}` +
          `${r.revisionSha ? ` @ ${r.revisionSha.slice(0, 12)}` : ""}${r.command ? ` (\`${r.command}\`)` : ""}`)]
      : []),
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
  const summary = (inv.evidence as { summary?: string } | undefined)?.summary ?? String(inv.description ?? "").split("\n")[0].slice(0, 120);
  const title = encodeURIComponent(`[PatchSignal] ${summary || "bug report"}`);
  const body = encodeURIComponent(markdown.slice(0, 7000));
  const issueUrl = `https://github.com/${inv.owner}/${inv.repo}/issues/new?title=${title}&body=${body}`;
  const tooLong = markdown.length > 7000;
  return NextResponse.json({ markdown, issueUrl, copyToClipboard: tooLong });
}
