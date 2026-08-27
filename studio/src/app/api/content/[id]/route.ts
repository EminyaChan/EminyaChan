import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { contentStatusEnum } from "@/lib/validation/schemas";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const content = await prisma.content.findFirst({
      where: { id, userId },
      include: {
        brand: true,
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
});

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = updateSchema.parse(await req.json());

    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });

    const content = await prisma.content.update({ where: { id }, data: input });
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
