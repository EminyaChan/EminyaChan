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
        strategy: { select: { id: true } },
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
        businessName: input.businessName || null,
        industry: input.industry || null,
        product: input.product || null,
        location: input.location || null,
        targetAudience: input.targetAudience || null,
        objective: input.objective || null,
        budget: input.budget || null,
        promotion: input.promotion || null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        sellingPoints: input.sellingPoints,
        competitors: input.competitors,
        brandTone: input.brandTone || null,
        brandColors: input.brandColors,
        brandGuidelines: input.brandGuidelines || null,
        websiteUrl: input.websiteUrl || null,
        additionalNotes: input.additionalNotes || null,
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
