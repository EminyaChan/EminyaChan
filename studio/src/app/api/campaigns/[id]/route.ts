import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { campaignSchema } from "@/lib/validation/schemas";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        strategy: true,
        contents: {
          orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
          include: { images: { take: 1, orderBy: { createdAt: "desc" } }, videos: { take: 1, orderBy: { createdAt: "desc" } } },
        },
      },
    });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json(campaign);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = campaignSchema.partial().parse(await req.json());

    const existing = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description || null }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.platforms !== undefined && { platforms: input.platforms }),
        ...(input.businessName !== undefined && { businessName: input.businessName || null }),
        ...(input.industry !== undefined && { industry: input.industry || null }),
        ...(input.product !== undefined && { product: input.product || null }),
        ...(input.location !== undefined && { location: input.location || null }),
        ...(input.targetAudience !== undefined && { targetAudience: input.targetAudience || null }),
        ...(input.objective !== undefined && { objective: input.objective || null }),
        ...(input.budget !== undefined && { budget: input.budget || null }),
        ...(input.promotion !== undefined && { promotion: input.promotion || null }),
        ...(input.startDate !== undefined && { startDate: input.startDate ? new Date(input.startDate) : null }),
        ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
        ...(input.sellingPoints !== undefined && { sellingPoints: input.sellingPoints }),
        ...(input.competitors !== undefined && { competitors: input.competitors }),
        ...(input.brandTone !== undefined && { brandTone: input.brandTone || null }),
        ...(input.brandColors !== undefined && { brandColors: input.brandColors }),
        ...(input.brandGuidelines !== undefined && { brandGuidelines: input.brandGuidelines || null }),
        ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl || null }),
        ...(input.additionalNotes !== undefined && { additionalNotes: input.additionalNotes || null }),
      },
    });
    return NextResponse.json(campaign);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    // Unassign content rather than cascade-deleting it — a campaign going
    // away shouldn't take generated content with it.
    await prisma.content.updateMany({ where: { campaignId: id }, data: { campaignId: null } });
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
