import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { brandSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const userId = await requireUserId();
    const brands = await prisma.brand.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
    return NextResponse.json({ items: brands });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = brandSchema.parse(await req.json());

    if (input.isDefault) {
      await prisma.brand.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const brand = await prisma.brand.create({
      data: {
        userId,
        name: input.name,
        description: input.description || null,
        industry: input.industry || null,
        targetAudience: input.targetAudience || null,
        voice: input.voice || null,
        preferredLanguages: input.preferredLanguages,
        preferredPlatforms: input.preferredPlatforms,
        sellingPoints: input.sellingPoints,
        forbiddenWords: input.forbiddenWords,
        preferredCta: input.preferredCta || null,
        website: input.website || null,
        socialAccounts: input.socialAccounts ?? undefined,
        isDefault: input.isDefault ?? false,
      },
    });
    return NextResponse.json(brand, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
