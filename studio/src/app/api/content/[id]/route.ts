import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { contentStatusEnum, contentTypeEnum, platformEnum } from "@/lib/validation/schemas";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const content = await prisma.content.findFirst({
      where: { id, userId },
      include: {
        brand: true,
        campaign: { select: { id: true, name: true } },
        versions: { orderBy: { versionNumber: "desc" } },
        images: { orderBy: { createdAt: "desc" } },
        videos: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    return NextResponse.json(content);
  } catch (err) {
    return handleApiError(err);
  }
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  cta: z.string().optional().nullable(),
  hashtags: z.array(z.string()).optional(),
  status: contentStatusEnum.optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  campaignId: z.string().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  contentPillar: z.string().nullable().optional(),
  platform: platformEnum.optional(),
  contentType: contentTypeEnum.optional(),
});

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = updateSchema.parse(await req.json());

    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });

    if (input.campaignId) {
      const campaign = await prisma.campaign.findFirst({ where: { id: input.campaignId, userId } });
      if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { scheduledDate, ...rest } = input;
    const content = await prisma.content.update({
      where: { id },
      data: {
        ...rest,
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
      },
      include: { campaign: { select: { id: true, name: true } } },
    });
    return NextResponse.json(content);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    await prisma.content.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
