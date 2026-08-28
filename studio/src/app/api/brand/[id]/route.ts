import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { brandSchema } from "@/lib/validation/schemas";

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = brandSchema.partial().parse(await req.json());

    const existing = await prisma.brand.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

    if (input.isDefault) {
      await prisma.brand.updateMany({ where: { userId, isDefault: true, NOT: { id } }, data: { isDefault: false } });
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description || null }),
        ...(input.industry !== undefined && { industry: input.industry || null }),
        ...(input.targetAudience !== undefined && { targetAudience: input.targetAudience || null }),
        ...(input.voice !== undefined && { voice: input.voice || null }),
        ...(input.preferredLanguages !== undefined && { preferredLanguages: input.preferredLanguages }),
        ...(input.preferredPlatforms !== undefined && { preferredPlatforms: input.preferredPlatforms }),
        ...(input.sellingPoints !== undefined && { sellingPoints: input.sellingPoints }),
        ...(input.forbiddenWords !== undefined && { forbiddenWords: input.forbiddenWords }),
        ...(input.preferredCta !== undefined && { preferredCta: input.preferredCta || null }),
        ...(input.website !== undefined && { website: input.website || null }),
        ...(input.socialAccounts !== undefined && { socialAccounts: input.socialAccounts }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });
    return NextResponse.json(brand);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.brand.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
