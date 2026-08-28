import { generateText, type GenerationContext } from "@/lib/ai";
import { prisma } from "@/lib/db/prisma";

export interface StandardVariant {
  title: string;
  body: string;
  cta: string;
  hashtags: string[];
  sections?: null;
}

export interface XhsVariant {
  titles: string[];
  hook: string;
  body: string;
  introduction: string;
  benefits: string[];
  cta: string;
  hashtags: string[];
}

export interface HeadlineVariant {
  variations: string[];
}

export interface VideoScriptVariant {
  title: string;
  hook: string;
  scenes: { visual: string; dialogue: string; onScreenText: string }[];
  cta: string;
  caption: string;
  hashtags: string[];
  thumbnailPrompt: string;
}

export type GeneratedVariant = StandardVariant | XhsVariant | HeadlineVariant | VideoScriptVariant;

function safeParseJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coerceVariant(ctx: GenerationContext, raw: Record<string, unknown> | null, rawText: string): GeneratedVariant {
  if (ctx.contentType === "VIDEO_SCRIPT") {
    const rawScenes = Array.isArray(raw?.scenes) ? (raw!.scenes as Record<string, unknown>[]) : [];
    return {
      title: typeof raw?.title === "string" ? raw.title : ctx.product,
      hook: typeof raw?.hook === "string" ? raw.hook : "",
      scenes: rawScenes.length
        ? rawScenes.map((s) => ({
            visual: typeof s.visual === "string" ? s.visual : "",
            dialogue: typeof s.dialogue === "string" ? s.dialogue : "",
            onScreenText: typeof s.onScreenText === "string" ? s.onScreenText : "",
          }))
        : [{ visual: rawText, dialogue: "", onScreenText: "" }],
      cta: typeof raw?.cta === "string" ? raw.cta : "",
      caption: typeof raw?.caption === "string" ? raw.caption : "",
      hashtags: Array.isArray(raw?.hashtags) ? (raw!.hashtags as string[]) : [],
      thumbnailPrompt: typeof raw?.thumbnailPrompt === "string" ? raw.thumbnailPrompt : "",
    };
  }
  if (ctx.contentType === "HEADLINE" || ctx.contentType === "CTA") {
    const variations = Array.isArray(raw?.variations) ? (raw!.variations as string[]) : [rawText];
    return { variations: variations.filter(Boolean).slice(0, 5) };
  }
  if (ctx.platform === "XIAOHONGSHU") {
    return {
      titles: Array.isArray(raw?.titles) ? (raw!.titles as string[]) : [rawText.slice(0, 40)],
      hook: typeof raw?.hook === "string" ? raw.hook : "",
      body: typeof raw?.body === "string" ? raw.body : rawText,
      introduction: typeof raw?.introduction === "string" ? raw.introduction : "",
      benefits: Array.isArray(raw?.benefits) ? (raw!.benefits as string[]) : [],
      cta: typeof raw?.cta === "string" ? raw.cta : "",
      hashtags: Array.isArray(raw?.hashtags) ? (raw!.hashtags as string[]) : [],
    };
  }
  return {
    title: typeof raw?.title === "string" ? raw.title : ctx.businessName,
    body: typeof raw?.body === "string" ? raw.body : rawText,
    cta: typeof raw?.cta === "string" ? raw.cta : "",
    hashtags: Array.isArray(raw?.hashtags) ? (raw!.hashtags as string[]) : [],
  };
}

export interface GenerationOutcome {
  variants: GeneratedVariant[];
  provider: string;
  model: string;
  isFallback: boolean;
  fallbackReason?: string;
}

export async function runGeneration(
  userId: string,
  ctx: GenerationContext,
  variationCount: number,
  preferredProvider?: string | null,
  contentId?: string
): Promise<GenerationOutcome> {
  const variants: GeneratedVariant[] = [];
  let provider = "template";
  let model = "template-v1";
  let isFallback = true;
  let fallbackReason: string | undefined;

  for (let i = 0; i < variationCount; i++) {
    const started = Date.now();
    const result = await generateText(
      { ...ctx, specialInstructions: variationCount > 1 ? `${ctx.specialInstructions ?? ""}\nGenerate a distinctly different angle from other variations (variant ${i + 1} of ${variationCount}).` : ctx.specialInstructions },
      { preferredProvider }
    );
    provider = result.provider;
    model = result.model;
    isFallback = result.isFallback;
    fallbackReason = result.fallbackReason;

    const parsed = safeParseJson(result.text);
    variants.push(coerceVariant(ctx, parsed, result.text));

    await prisma.generationHistory.create({
      data: {
        userId,
        contentId: contentId ?? null,
        type: "TEXT",
        provider: result.provider,
        model: result.model,
        status: result.isFallback ? (fallbackReason ? "FALLBACK" : "FALLBACK") : "SUCCESS",
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        estimatedCostUsd: estimateCost(result.provider, result.promptTokens, result.completionTokens),
        errorMessage: fallbackReason,
        durationMs: Date.now() - started,
      },
    });
  }

  return { variants, provider, model, isFallback, fallbackReason };
}

const PRICING_PER_1K: Record<string, { input: number; output: number }> = {
  openai: { input: 0.00015, output: 0.0006 },
  anthropic: { input: 0.003, output: 0.015 },
  gemini: { input: 0.000075, output: 0.0003 },
};

function estimateCost(provider: string, promptTokens?: number, completionTokens?: number): number | null {
  const pricing = PRICING_PER_1K[provider];
  if (!pricing || promptTokens == null || completionTokens == null) return null;
  return (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
}
