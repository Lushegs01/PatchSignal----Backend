import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { seedDemo } from "@/lib/demo/seed";

// Seeds/resets the demo account from inside the deployment, where the DB is
// reachable. Disabled (404) unless SEED_TOKEN is set; send it as a Bearer token.
// Body (optional JSON): { "reset": true } also deletes the demo account's other
// investigations; { "password": "..." } sets the demo password.
function tokenMatches(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const expected = process.env.SEED_TOKEN ?? "";
  if (!expected) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [scheme, token] = (req.headers.get("authorization") ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token || !tokenMatches(token, expected)) {
    return NextResponse.json({ error: "invalid seed token" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "seeding requires DATABASE_URL" }, { status: 503 });
  }
  const body = ((await req.json().catch(() => null)) ?? {}) as { reset?: unknown; password?: unknown };
  try {
    const result = await seedDemo(prisma, {
      email: process.env.SEED_DEMO_EMAIL,
      password: typeof body.password === "string" && body.password ? body.password : process.env.SEED_DEMO_PASSWORD,
      reset: body.reset === true,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "seed failed" }, { status: 500 });
  }
}
