import { NextResponse } from "next/server";
import { getInvestigation } from "@/lib/investigations";
import { authUser, owns } from "@/lib/auth";

// SSE progress: emits stage once (MVP). Use fetch with Authorization header
// (browser EventSource cannot set headers).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const inv = await getInvestigation(id);
  if (!owns(inv as { userId?: string | null }, auth.userId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const stage = (inv as { stage?: string } | null)?.stage ?? "intake";
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(`event: stage\ndata: ${JSON.stringify({ id, stage })}\n\n`);
      c.enqueue(`event: done\ndata: ${JSON.stringify({ id })}\n\n`);
      c.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
  });
}
