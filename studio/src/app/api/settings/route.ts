import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { isImageProviderConfigured, isRealTextProviderConfigured } from "@/lib/ai";

export async function GET() {
  try {
    const userId = await requireUserId();
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return NextResponse.json({
      settings,
      environment: {
        textProviderConfigured: isRealTextProviderConfigured(),
        imageProviderConfigured: isImageProviderConfigured(),
        videoProviderConfigured: false,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateSchema = z.object({
  defaultTextProvider: z.string().optional().nullable(),
  defaultImageProvider: z.string().optional().nullable(),
  defaultVideoProvider: z.string().optional().nullable(),
  defaultLanguage: z.string().optional(),
});

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const input = updateSchema.parse(await req.json());
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
    });
    return NextResponse.json(settings);
  } catch (err) {
    return handleApiError(err);
  }
}
