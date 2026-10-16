import { NextResponse } from "next/server";
import { dbHealthy } from "@/lib/db/client";

export async function GET() {
  const db = await dbHealthy();
  return NextResponse.json({
    ok: true,
    db: process.env.DATABASE_URL ? db : { ok: false, error: "DATABASE_URL not set (memory store)" },
    runner: process.env.RUNNER_URL ?? "http://localhost:5001",
    store: process.env.DATABASE_URL ? "postgres" : "memory",
  });
}
