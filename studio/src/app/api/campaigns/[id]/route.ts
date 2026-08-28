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
        contents: {
          orderBy: { createdAt: "desc" },
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
