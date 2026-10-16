import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { authUser } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (auth instanceof NextResponse) return auth;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
  return NextResponse.json(user);
}
