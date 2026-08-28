import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const userId = await requireUserId();
    const { id, versionId } = await params;

    const content = await prisma.content.findFirst({ where: { id, userId } });
    if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });

    const version = await prisma.contentVersion.findFirst({ where: { id: versionId, contentId: id } });
    if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    const nextVersion = content.currentVersionNumber + 1;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.contentVersion.create({
        data: {
          contentId: id,
          versionNumber: nextVersion,
          title: version.title,
          body: version.body,
          cta: version.cta,
          hashtags: version.hashtags,
          sections: version.sections ?? undefined,
          changeNote: `Restored from version ${version.versionNumber}`,
        },
      });
      return tx.content.update({
        where: { id },
        data: {
          title: version.title,
          body: version.body,
          cta: version.cta,
          hashtags: version.hashtags,
          sections: version.sections ?? undefined,
          currentVersionNumber: nextVersion,
        },
        include: { versions: { orderBy: { versionNumber: "desc" } } },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
