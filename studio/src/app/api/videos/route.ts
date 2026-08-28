import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { videoGenerateSchema } from "@/lib/validation/schemas";
import type { GenerationContext } from "@/lib/ai";
import { runGeneration, type VideoScriptVariant } from "@/lib/generation/service";
import { toJsonInput } from "@/lib/db/json";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = videoGenerateSchema.parse(await req.json());

    if (input.contentId) {
      const owns = await prisma.content.findFirst({ where: { id: input.contentId, userId } });
      if (!owns) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const ctx: GenerationContext = {
      businessName: input.product,
      industry: "General",
      product: input.product,
      targetAudience: input.targetAudience || undefined,
      platform: input.platform,
      contentType: "VIDEO_SCRIPT",
      tone: "Friendly",
      language: input.language,
      length: input.duration === "15s" ? "short" : input.duration === "60s" ? "long" : "medium",
      objective: input.objective,
      specialInstructions: input.style ? `Visual style: ${input.style}.` : undefined,
    };

    const outcome = await runGeneration(userId, ctx, 1, undefined, input.contentId ?? undefined);
    const plan = outcome.variants[0] as VideoScriptVariant;

    const video = await prisma.generatedVideo.create({
      data: {
        contentId: input.contentId || null,
        title: plan.title,
        plan: toJsonInput(plan),
        caption: plan.caption,
        hashtags: plan.hashtags,
        thumbnailPrompt: plan.thumbnailPrompt,
        status: "PENDING",
      },
    });

    return NextResponse.json({ video, provider: outcome.provider, isFallback: outcome.isFallback, fallbackReason: outcome.fallbackReason });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId");
    const videos = await prisma.generatedVideo.findMany({
      where: contentId ? { contentId, content: { userId } } : { content: { userId } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ items: videos });
  } catch (err) {
    return handleApiError(err);
  }
}
