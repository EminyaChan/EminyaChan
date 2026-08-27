import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { contentStatusEnum, contentTypeEnum, platformEnum } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";
import { toJsonInput } from "@/lib/db/json";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("q")?.trim();
    const platform = searchParams.get("platform");
    const industry = searchParams.get("industry");
    const contentType = searchParams.get("contentType");
    const status = searchParams.get("status");
    const favorite = searchParams.get("favorite");
    const sort = searchParams.get("sort") ?? "recent";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const where: Prisma.ContentWhereInput = { userId };
    if (platform) where.platform = platform as Prisma.EnumPlatformFilter["equals"];
    if (industry) where.industry = industry;
    if (contentType) where.contentType = contentType as Prisma.EnumContentTypeFilter["equals"];
    if (status) where.status = status as Prisma.EnumContentStatusFilter["equals"];
    if (favorite === "true") where.isFavorite = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
        { industry: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const orderBy: Prisma.ContentOrderByWithRelationInput =
      sort === "title" ? { title: "asc" } : sort === "updated" ? { updatedAt: "desc" } : { createdAt: "desc" };

    const items = await prisma.content.findMany({
      where,
      orderBy,
      take: limit,
      include: { brand: { select: { name: true } }, images: { take: 1, orderBy: { createdAt: "desc" } }, videos: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

const saveContentSchema = z.object({
  brandId: z.string().optional().nullable(),
  title: z.string().min(1),
  platform: platformEnum,
  industry: z.string().optional().nullable(),
  contentType: contentTypeEnum,
  targetAudience: z.string().optional().nullable(),
  status: contentStatusEnum.optional(),
  tags: z.array(z.string()).default([]),
  body: z.string().min(1),
  cta: z.string().optional().nullable(),
  hashtags: z.array(z.string()).default([]),
  sections: z.record(z.string(), z.unknown()).optional().nullable(),
  provider: z.string().optional(),
  model: z.string().optional(),
  generationInputs: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = saveContentSchema.parse(await req.json());

    const content = await prisma.content.create({
      data: {
        userId,
        brandId: input.brandId || null,
        title: input.title,
        platform: input.platform,
        industry: input.industry || null,
        contentType: input.contentType,
        targetAudience: input.targetAudience || null,
        status: input.status ?? "GENERATED",
        tags: input.tags,
        body: input.body,
        cta: input.cta || null,
        hashtags: input.hashtags,
        sections: input.sections ? toJsonInput(input.sections) : undefined,
        generationInputs: input.generationInputs ? toJsonInput(input.generationInputs) : undefined,
        currentVersionNumber: 1,
        versions: {
          create: {
            versionNumber: 1,
            title: input.title,
            body: input.body,
            cta: input.cta || null,
            hashtags: input.hashtags,
            sections: input.sections ? toJsonInput(input.sections) : undefined,
            changeNote: "Initial generation",
          },
        },
      },
      include: { versions: true },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
