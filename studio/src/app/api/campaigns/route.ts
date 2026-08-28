import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { campaignSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const userId = await requireUserId();
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { contents: true } },
        contents: { select: { status: true } },
      },
    });
    return NextResponse.json({ items: campaigns });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = campaignSchema.parse(await req.json());

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: input.name,
        description: input.description || null,
        status: input.status ?? "PLANNING",
        platforms: input.platforms,
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
