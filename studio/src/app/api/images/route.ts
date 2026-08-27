import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { imageGenerateSchema } from "@/lib/validation/schemas";
import { generateImage } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = imageGenerateSchema.parse(await req.json());

    if (input.contentId) {
      const owns = await prisma.content.findFirst({ where: { id: input.contentId, userId } });
      if (!owns) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const started = Date.now();
    const outcome = await generateImage({
      prompt: `${input.description}${input.brand ? ` for ${input.brand}` : ""}${input.platform ? `, for ${input.platform}` : ""}`,
      style: input.style || undefined,
      aspectRatio: input.aspectRatio,
      textOverlay: input.textOverlay || undefined,
    });

    const record = await prisma.generatedImage.create({
      data: {
        contentId: input.contentId || null,
        prompt: input.description,
        style: input.style || null,
        aspectRatio: input.aspectRatio,
        textOverlay: input.textOverlay || null,
        provider: outcome.result?.provider ?? (outcome.configured ? "openai" : null),
        model: outcome.result?.model ?? null,
        url: outcome.result?.url ?? null,
        status: outcome.result ? "COMPLETED" : "FAILED",
        error: outcome.error ?? null,
      },
    });

    await prisma.generationHistory.create({
      data: {
        userId,
        contentId: input.contentId || null,
        type: "IMAGE",
        provider: outcome.result?.provider ?? "none",
        model: outcome.result?.model ?? null,
        status: outcome.result ? "SUCCESS" : "ERROR",
        errorMessage: outcome.error ?? null,
        durationMs: Date.now() - started,
      },
    });

    if (!outcome.result) {
      return NextResponse.json({ image: record, configured: outcome.configured, error: outcome.error }, { status: 200 });
    }

    return NextResponse.json({ image: record, configured: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId");
    const images = await prisma.generatedImage.findMany({
      where: contentId ? { contentId, content: { userId } } : { content: { userId } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ items: images });
  } catch (err) {
    return handleApiError(err);
  }
}
