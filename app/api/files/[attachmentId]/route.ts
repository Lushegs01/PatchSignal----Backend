import { NextResponse } from "next/server";
import { authUser } from "@/lib/auth";

// MVP: Cloudinary secureUrls are delivered by Cloudinary CDN directly.
// This route resolves attachmentId -> secureUrl for the UI without leaking keys.
export async function GET(req: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;
  const { attachmentId } = await params;
  return NextResponse.json({ attachmentId, note: "fetch secureUrl from GET /api/investigations/:id" }, { status: 200 });
}

export function resolveAttachment(inv: unknown, attachmentId: string): string | null {
  const list = (inv as { attachments?: { publicId: string; secureUrl: string }[] }).attachments ?? [];
  return list.find((a) => a.publicId === attachmentId)?.secureUrl ?? null;
}
