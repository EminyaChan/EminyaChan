import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const original = await prisma.content.findFirst({ where: { id, userId }, include: { versions: true } });
    if (!original) return NextResponse.json({ error: "Content not found" }, { status: 404 });

    const copy = await prisma.content.create({
      data: {
        userId,
        brandId: original.brandId,
        title: `${original.title} (Copy)`,
        platform: original.platform,
        industry: original.industry,
        contentType: original.contentType,
        targetAudience: original.targetAudience,
        status: "DRAFT",
        tags: original.tags,
        body: original.body,
        cta: original.cta,
        hashtags: original.hashtags,
        sections: original.sections ?? undefined,
        currentVersionNumber: 1,
        versions: {
          create: {
            versionNumber: 1,
            title: `${original.title} (Copy)`,
            body: original.body,
            cta: original.cta,
            hashtags: original.hashtags,
            sections: original.sections ?? undefined,
            changeNote: `Duplicated from "${original.title}"`,
          },
        },
      },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
