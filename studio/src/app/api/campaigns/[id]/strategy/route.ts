import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { strategySchema } from "@/lib/validation/schemas";
import { generateStrategy } from "@/lib/generation/strategy";
import { toJsonInput } from "@/lib/db/json";

type Params = Promise<{ id: string }>;

// Generates (or regenerates) the AI marketing strategy for a campaign.
export async function POST(_req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const outcome = await generateStrategy(userId, campaign);
    const strategy = await prisma.marketingStrategy.findUnique({ where: { campaignId: id } });

    return NextResponse.json({ strategy, provider: outcome.provider, isFallback: outcome.isFallback, fallbackReason: outcome.fallbackReason });
  } catch (err) {
    return handleApiError(err);
  }
}

// Manual edits to strategy fields (e.g. adding/removing a content pillar).
export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const existing = await prisma.marketingStrategy.findUnique({ where: { campaignId: id } });
    if (!existing) return NextResponse.json({ error: "Generate a strategy first" }, { status: 404 });

    const input = strategySchema.parse(await req.json());
    const strategy = await prisma.marketingStrategy.update({
      where: { campaignId: id },
      data: {
        ...(input.contentPillars !== undefined && { contentPillars: input.contentPillars }),
        ...(input.audienceProfile !== undefined && { audienceProfile: toJsonInput(input.audienceProfile) }),
        ...(input.positioning !== undefined && { positioning: toJsonInput(input.positioning) }),
        ...(input.recommendedPlatforms !== undefined && { recommendedPlatforms: toJsonInput(input.recommendedPlatforms) }),
      },
    });
    return NextResponse.json(strategy);
  } catch (err) {
    return handleApiError(err);
  }
}
