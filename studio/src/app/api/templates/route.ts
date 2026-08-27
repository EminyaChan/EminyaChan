import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const industryId = searchParams.get("industryId");

    const items = await prisma.template.findMany({
      where: {
        AND: [{ OR: [{ isSystem: true }, { userId }] }, industryId ? { industryId } : {}],
      },
      include: { industry: true },
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  industryId: z.string().optional().nullable(),
  platform: z.string().optional().or(z.literal("")),
  contentType: z.string().optional().or(z.literal("")),
  tone: z.string().optional().or(z.literal("")),
  promptHints: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = createSchema.parse(await req.json());

    const template = await prisma.template.create({
      data: {
        userId,
        name: input.name,
        description: input.description || null,
        industryId: input.industryId || null,
        platform: input.platform || null,
        contentType: input.contentType || null,
        tone: input.tone || null,
        promptHints: input.promptHints || null,
        isSystem: false,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
