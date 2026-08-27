import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);

    const [items, totals] = await Promise.all([
      prisma.generationHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { content: { select: { id: true, title: true } } },
      }),
      prisma.generationHistory.aggregate({
        where: { userId },
        _sum: { promptTokens: true, completionTokens: true, estimatedCostUsd: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      items,
      totals: {
        count: totals._count,
        promptTokens: totals._sum.promptTokens ?? 0,
        completionTokens: totals._sum.completionTokens ?? 0,
        estimatedCostUsd: totals._sum.estimatedCostUsd ?? 0,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
