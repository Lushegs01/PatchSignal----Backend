import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { checkPassword, normalizeEmail, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "auth requires DATABASE_URL" }, { status: 503 });
  }
  const { email = "", password = "" } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(String(email)) } });
  if (!user || !(await checkPassword(String(password), user.passwordHash))) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }
  const { passwordHash: _omit, ...safe } = user;
  void _omit;
  return NextResponse.json({ ...safe, token: signToken(user.id, user.email) });
}
