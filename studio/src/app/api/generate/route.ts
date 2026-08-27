import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { generateContentSchema } from "@/lib/validation/schemas";
import { inputToContext } from "@/lib/generation/context";
import { runGeneration } from "@/lib/generation/service";

// Generates content preview(s) — NOT persisted. The client shows the
// variation(s) and calls POST /api/content to save the one the user picks.
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const input = generateContentSchema.parse(body);

    const brand = input.brandId ? await prisma.brand.findFirst({ where: { id: input.brandId, userId } }) : null;
    const ctx = inputToContext(input, brand);

    const outcome = await runGeneration(userId, ctx, input.variations, undefined);

    return NextResponse.json({
      variants: outcome.variants,
      provider: outcome.provider,
      model: outcome.model,
      isFallback: outcome.isFallback,
      fallbackReason: outcome.fallbackReason,
      context: ctx,
      brandId: brand?.id ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
