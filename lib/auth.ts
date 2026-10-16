import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

function secret(): string {
  const s = process.env.JWT_SECRET ?? "";
  if (!s) throw new Error("JWT_SECRET not set — add it to .env and restart.");
  return s;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, secret(), { expiresIn: "7d" });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validCredentials(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "valid email required";
  if (password.length < 8) return "password must be at least 8 characters";
  return null;
}

// Returns userId or a 401 response. Auth needs Postgres (users live in PG only).
export async function authUser(req: Request): Promise<{ userId: string } | NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "auth requires DATABASE_URL" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return NextResponse.json({ error: "Bearer token required" }, { status: 401 });
  }
  try {
    const payload = jwt.verify(token, secret()) as { sub?: string };
    if (!payload.sub) throw new Error("no sub");
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 401 });
    return { userId: user.id };
  } catch {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 401 });
  }
}

export function owns(inv: unknown, userId: string): boolean {
  if (!inv || typeof inv !== "object") return false;
  return (inv as { userId?: string | null }).userId === userId;
}
