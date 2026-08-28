import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { calendarGenerateSchema } from "@/lib/validation/schemas";
import { generateCalendarPlan, persistCalendarItems } from "@/lib/generation/calendar";

type Params = Promise<{ id: string }>;

// Generates a content calendar for the campaign: a batch of planned
// content items (status IDEA) with a date, platform, and content pillar
// each. Full copy for each item is written later, on demand, when the
// user opens it (Step 4) — the calendar itself is just the plan.
export async function POST(req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({ where: { id, userId }, include: { strategy: true } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const input = calendarGenerateSchema.parse(await req.json().catch(() => ({})));
    const platforms = input.platforms?.length ? input.platforms : campaign.platforms.length ? campaign.platforms : ["INSTAGRAM", "FACEBOOK"];
    const pillars = input.pillars?.length
      ? input.pillars
      : campaign.strategy?.contentPillars.length
        ? campaign.strategy.contentPillars
        : ["Educational", "Promotional", "Social Proof", "Behind the Scenes", "Storytelling"];

    const outcome = await generateCalendarPlan(campaign, pillars, platforms, input.postsPerWeek);
    const created = await persistCalendarItems(userId, campaign, outcome.items);

    return NextResponse.json({
      items: created,
      provider: outcome.provider,
      isFallback: outcome.isFallback,
      fallbackReason: outcome.fallbackReason,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
