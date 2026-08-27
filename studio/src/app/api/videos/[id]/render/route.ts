import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { generateVideoAsset } from "@/lib/ai";

// Attempts to render the actual video file for a previously-generated plan.
// No first-party video-rendering provider is connected yet (see
// lib/ai/providers/video.ts), so this always reports a clear, honest
// "not configured" failure instead of pretending a video was produced.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const video = await prisma.generatedVideo.findFirst({
      where: { id, OR: [{ content: { userId } }, { content: null }] },
    });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    const outcome = await generateVideoAsset();

    const updated = await prisma.generatedVideo.update({
      where: { id },
      data: {
        status: outcome.configured ? "COMPLETED" : "FAILED",
        error: outcome.configured ? null : outcome.error,
      },
    });

    await prisma.generationHistory.create({
      data: {
        userId,
        contentId: video.contentId,
        type: "VIDEO",
        provider: outcome.configured ? "connected-provider" : "none",
        status: outcome.configured ? "SUCCESS" : "ERROR",
        errorMessage: outcome.configured ? null : outcome.error,
      },
    });

    return NextResponse.json({ video: updated, configured: outcome.configured, error: outcome.error });
  } catch (err) {
    return handleApiError(err);
  }
}
