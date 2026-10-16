import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashPassword, normalizeEmail, signToken, validCredentials } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "auth requires DATABASE_URL" }, { status: 503 });
  }
  const { email = "", password = "", name = "" } = await req.json().catch(() => ({}));
  const err = validCredentials(String(email), String(password));
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const normalized = normalizeEmail(String(email));
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return NextResponse.json({ error: "email already registered" }, { status: 409 });

  const user = await prisma.user.create({
    data: { email: normalized, passwordHash: await hashPassword(String(password)), name: String(name) || null },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json({ ...user, token: signToken(user.id, user.email) }, { status: 201 });
}
