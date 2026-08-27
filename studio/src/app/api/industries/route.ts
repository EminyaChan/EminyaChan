import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    await requireUserId();
    const industries = await prisma.industry.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ items: industries });
  } catch (err) {
    return handleApiError(err);
  }
}
