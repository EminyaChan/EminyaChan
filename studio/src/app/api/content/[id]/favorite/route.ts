import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    const updated = await prisma.content.update({ where: { id }, data: { isFavorite: !existing.isFavorite } });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
