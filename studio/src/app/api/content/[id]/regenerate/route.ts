import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import type { GenerationContext } from "@/lib/ai";
import { brandToContext } from "@/lib/generation/context";
import { runGeneration, type GeneratedVariant, type StandardVariant, type XhsVariant } from "@/lib/generation/service";
import { toJsonInput } from "@/lib/db/json";

const bodySchema = z.object({
  section: z.enum(["title", "hook", "content", "cta", "titles", "benefits", "hashtags", "full"]).default("full"),
});

function rebuildContext(content: Awaited<ReturnType<typeof loadContent>>): GenerationContext {
  const stored = (content!.generationInputs as Partial<GenerationContext> | null) ?? {};
  return {
    businessName: stored.businessName || content!.brand?.name || content!.title,
    industry: stored.industry || content!.industry || "General",
    product: stored.product || content!.title,
    productDescription: stored.productDescription,
    targetAudience: stored.targetAudience || content!.targetAudience || undefined,
    location: stored.location,
    sellingPoints: stored.sellingPoints,
    promotion: stored.promotion,
    websiteUrl: stored.websiteUrl,
    platform: content!.platform,
    contentType: content!.contentType,
    tone: stored.tone || "Friendly",
    language: stored.language || "English",
    length: stored.length || "medium",
    objective: stored.objective,
    specialInstructions: stored.specialInstructions,
    brand: brandToContext(content!.brand),
  };
}

async function loadContent(id: string, userId: string) {
  return prisma.content.findFirst({ where: { id, userId }, include: { brand: true } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { section } = bodySchema.parse(await req.json().catch(() => ({})));

    const content = await loadContent(id, userId);
    if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });

    const baseCtx = rebuildContext(content);
    const isFull = section === "full";
    const ctx: GenerationContext = isFull
      ? baseCtx
      : {
          ...baseCtx,
          focusSection: section,
          existingContent: {
            title: content.title,
            body: content.body,
            cta: content.cta,
            hashtags: content.hashtags,
            sections: content.sections,
          },
        };

    const outcome = await runGeneration(userId, ctx, 1, undefined, content.id);
    const variant = outcome.variants[0];

    const nextVersion = content.currentVersionNumber + 1;
    const merged = mergeVariant(content, variant, section);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.contentVersion.create({
        data: {
          contentId: content.id,
          versionNumber: nextVersion,
          title: merged.title,
          body: merged.body,
          cta: merged.cta,
          hashtags: merged.hashtags,
          sections: merged.sections ? toJsonInput(merged.sections) : undefined,
          changeNote: isFull ? "Full regeneration" : `Regenerated: ${section}`,
        },
      });
      return tx.content.update({
        where: { id: content.id },
        data: {
          title: merged.title,
          body: merged.body,
          cta: merged.cta,
          hashtags: merged.hashtags,
          sections: merged.sections ? toJsonInput(merged.sections) : undefined,
          currentVersionNumber: nextVersion,
          status: content.status === "DRAFT" ? "DRAFT" : "GENERATED",
        },
        include: { versions: { orderBy: { versionNumber: "desc" } } },
      });
    });

    return NextResponse.json({ content: updated, provider: outcome.provider, isFallback: outcome.isFallback, fallbackReason: outcome.fallbackReason });
  } catch (err) {
    return handleApiError(err);
  }
}

interface MergedFields {
  title: string;
  body: string;
  cta: string | null;
  hashtags: string[];
  sections: Record<string, unknown> | null;
}

function mergeVariant(
  content: { title: string; body: string; cta: string | null; hashtags: string[]; sections: unknown },
  variant: GeneratedVariant,
  section: string
): MergedFields {
  const existingSections = (content.sections as Record<string, unknown> | null) ?? null;

  if ("titles" in variant) {
    const v = variant as XhsVariant;
    if (section === "full") {
      return {
        title: v.titles[0] ?? content.title,
        body: v.body,
        cta: v.cta,
        hashtags: v.hashtags,
        sections: { titles: v.titles, hook: v.hook, body: v.body, introduction: v.introduction, benefits: v.benefits, cta: v.cta, hashtags: v.hashtags },
      };
    }
    // section-focused: merge only the relevant piece into existing sections
    const merged = { ...(existingSections ?? {}) } as Record<string, unknown>;
    if (section === "titles") merged.titles = v.titles;
    if (section === "hook") merged.hook = v.hook;
    if (section === "content") merged.body = v.body;
    if (section === "cta") merged.cta = v.cta;
    if (section === "benefits") merged.benefits = v.benefits;
    if (section === "hashtags") merged.hashtags = v.hashtags;
    return {
      title: section === "titles" ? v.titles[0] ?? content.title : content.title,
      body: section === "content" ? v.body : content.body,
      cta: section === "cta" ? v.cta : content.cta,
      hashtags: section === "hashtags" ? v.hashtags : content.hashtags,
      sections: merged,
    };
  }

  if ("variations" in variant) {
    return { title: content.title, body: variant.variations.join("\n"), cta: content.cta, hashtags: content.hashtags, sections: existingSections };
  }

  const v = variant as StandardVariant;
  if (section === "full") {
    return { title: v.title, body: v.body, cta: v.cta, hashtags: v.hashtags, sections: null };
  }
  return {
    title: section === "title" ? v.title : content.title,
    body: section === "content" ? v.body : content.body,
    cta: section === "cta" ? v.cta : content.cta,
    hashtags: section === "hashtags" ? v.hashtags : content.hashtags,
    sections: existingSections,
  };
}
