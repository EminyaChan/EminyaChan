import type { AITextProvider, GenerationContext, TextGenerationResult } from "../types";

// Deterministic, no-API-key-required fallback. Used automatically when no
// text provider is configured, and whenever a real provider call fails, so
// the app always produces usable content instead of blocking the user.
// Clearly labeled as a fallback everywhere it surfaces in the UI.

const HOOK_STYLES = [
  (b: string) => `Okay I need to talk about ${b}...`,
  (b: string) => `Not me becoming obsessed with ${b} 😭`,
  (b: string) => `Wait, why did nobody tell me about ${b} sooner?`,
  (b: string) => `POV: you just found ${b} and your life changed a little.`,
  (b: string) => `Real talk — here's why ${b} has been on my radar lately.`,
];

const TITLE_ANGLES = [
  (b: string, p: string) => `${b}: the ${p} everyone's quietly obsessed with`,
  (b: string, p: string) => `5 reasons ${p} from ${b} is worth it`,
  (b: string, p: string) => `I tried ${p} from ${b} so you don't have to`,
  (b: string, p: string, l?: string) => (l ? `${l}'s best-kept secret: ${b}` : `The ${p} secret nobody's talking about`),
  (b: string, p: string) => `Struggling with this? ${b}'s ${p} might be the fix`,
];

const CTA_BY_OBJECTIVE: Record<string, string[]> = {
  default: ["Tap the link to learn more", "DM us to get started", "Visit us today", "Book now — spots are limited"],
  awareness: ["Follow for more", "Save this for later", "Share with someone who needs this"],
  sales: ["Shop now", "Grab yours before it's gone", "Order today"],
  leads: ["Drop a comment to claim yours", "Message us for details", "Click the link in bio"],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function toneAdjective(tone: string): string {
  const map: Record<string, string> = {
    Professional: "reliable",
    Friendly: "welcoming",
    Casual: "easygoing",
    Luxury: "elevated",
    Funny: "playfully unhinged (in a good way)",
    Educational: "genuinely useful",
    Emotional: "close to the heart",
    "Viral/Social-media style": "impossible to scroll past",
  };
  return map[tone] ?? "genuinely great";
}

function sellingPointsList(ctx: GenerationContext): string[] {
  const raw = ctx.brand?.sellingPoints?.length ? ctx.brand.sellingPoints.join(", ") : ctx.sellingPoints;
  if (!raw) return [`Quality ${ctx.product.toLowerCase()} you can trust`, `Backed by ${ctx.businessName}`, `Made for ${ctx.targetAudience || "people who care about the details"}`];
  return raw
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function stripForbidden(text: string, forbidden?: string[]): string {
  if (!forbidden?.length) return text;
  let out = text;
  for (const word of forbidden) {
    if (!word.trim()) continue;
    out = out.replace(new RegExp(word.trim(), "gi"), "").replace(/\s{2,}/g, " ");
  }
  return out.trim();
}

function lengthPad(base: string, length: GenerationContext["length"], extra: string): string {
  if (length === "short") return base;
  if (length === "medium") return `${base}\n\n${extra}`;
  return `${base}\n\n${extra}\n\nWhat makes this stick: it's not about the hype, it's about ${extra.slice(0, 60).toLowerCase()}... and honestly, that's rare these days.`;
}

function buildDefaultOutput(ctx: GenerationContext, seed: number) {
  const points = sellingPointsList(ctx);
  const cta = ctx.brand?.preferredCta || pick(CTA_BY_OBJECTIVE[ctx.objective ?? "default"] ?? CTA_BY_OBJECTIVE.default, seed);
  const title = pick(TITLE_ANGLES, seed)(ctx.businessName, ctx.product, ctx.location);
  const promoLine = ctx.promotion ? ` Right now: ${ctx.promotion}.` : "";
  const base = `${ctx.businessName} brings a ${toneAdjective(ctx.tone)} take on ${ctx.product.toLowerCase()}${ctx.location ? ` in ${ctx.location}` : ""}. ${points[0]}.${promoLine}`;
  const extra = `Here's what people notice first: ${points.slice(1).join(". ")}.`;
  const body = lengthPad(base, ctx.length, extra);
  return {
    title,
    body: stripForbidden(body, ctx.brand?.forbiddenWords),
    cta,
    hashtags: buildHashtags(ctx),
  };
}

function buildHashtags(ctx: GenerationContext): string[] {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9一-龥]/g, "");
  const tags = new Set<string>();
  tags.add(clean(ctx.businessName));
  tags.add(clean(ctx.industry));
  clean(ctx.product)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .forEach((w) => tags.add(w));
  if (ctx.location) tags.add(clean(ctx.location));
  tags.add(ctx.platform === "XIAOHONGSHU" ? "种草" : "MarketingTips");
  tags.add(ctx.platform.toLowerCase());
  return Array.from(tags).filter((t) => t.length > 1).slice(0, 8);
}

function buildXiaohongshuOutput(ctx: GenerationContext, seed: number) {
  const points = sellingPointsList(ctx);
  const hook = pick(HOOK_STYLES, seed)(ctx.businessName);
  const titles = TITLE_ANGLES.map((fn) => fn(ctx.businessName, ctx.product, ctx.location)).map((t, i) =>
    i === 0 ? `${t} 🌟` : t
  );
  const introduction = `${ctx.businessName} 主要做 ${ctx.product}${ctx.location ? `，就在 ${ctx.location}` : ""}。${ctx.productDescription ?? ""}`.trim();
  const bodyLines = [
    `真的没有夸张，${points[0]}真的绝了 ✨`,
    points[1] ? `而且${points[1]}，这点我很喜欢。` : "",
    ctx.promotion ? `现在还有活动：${ctx.promotion} 🔥` : "",
  ].filter(Boolean);
  const cta = ctx.brand?.preferredCta || "评论区告诉我你的看法，想了解更多戳主页～";
  return {
    titles,
    hook,
    body: stripForbidden(bodyLines.join("\n"), ctx.brand?.forbiddenWords),
    introduction,
    benefits: points.map((p) => `✔️ ${p}`),
    cta,
    hashtags: buildHashtags(ctx),
  };
}

function buildVariations(ctx: GenerationContext) {
  const base = ctx.businessName + ctx.product + ctx.platform + ctx.contentType + (ctx.focusSection ?? "");
  return { seed: hashSeed(base + Date.now().toString().slice(-4)) };
}

function buildVideoScriptOutput(ctx: GenerationContext, seed: number) {
  const points = sellingPointsList(ctx);
  const hook = pick(HOOK_STYLES, seed)(ctx.businessName);
  const cta = ctx.brand?.preferredCta || pick(CTA_BY_OBJECTIVE[ctx.objective ?? "default"] ?? CTA_BY_OBJECTIVE.default, seed);
  const sameNameAsProduct = ctx.businessName.trim().toLowerCase() === ctx.product.trim().toLowerCase();
  const locationSuffix = ctx.location ? ` in ${ctx.location}` : "";
  return {
    title: `${ctx.businessName}${sameNameAsProduct ? "" : `: ${ctx.product}`} in ${ctx.length === "short" ? "15" : ctx.length === "long" ? "45" : "30"} seconds`,
    hook,
    scenes: [
      {
        visual: sameNameAsProduct
          ? `Close-up establishing shot of ${ctx.product.toLowerCase()}${locationSuffix}.`
          : `Close-up establishing shot of ${ctx.product.toLowerCase()} at ${ctx.businessName}${locationSuffix}.`,
        dialogue: hook,
        onScreenText: points[0] ?? ctx.product,
      },
      {
        visual: `Quick cuts showing ${ctx.product.toLowerCase()} in use, natural lighting, handheld feel.`,
        dialogue: `Here's what makes it different: ${points[1] ?? points[0]}.`,
        onScreenText: points[1] ?? "Why people love it",
      },
      {
        visual: `Final shot on ${ctx.businessName} branding or storefront, warm and inviting.`,
        dialogue: ctx.promotion ? `Right now: ${ctx.promotion}.` : `Come see for yourself.`,
        onScreenText: cta,
      },
    ],
    cta,
    caption: `${hook} ${ctx.promotion ? `${ctx.promotion} — ` : ""}${cta}`,
    hashtags: buildHashtags(ctx),
    thumbnailPrompt: `${ctx.product} from ${ctx.businessName}, ${ctx.tone.toLowerCase()} mood, bold on-brand colors, text space at top for a hook headline`,
  };
}

export class TemplateTextProvider implements AITextProvider {
  readonly id = "template";

  async generateText(ctx: GenerationContext): Promise<TextGenerationResult> {
    const { seed } = buildVariations(ctx);

    if (ctx.contentType === "VIDEO_SCRIPT") {
      const out = buildVideoScriptOutput(ctx, seed);
      return { text: JSON.stringify(out), provider: this.id, model: "template-v1", isFallback: true };
    }

    if (ctx.contentType === "HEADLINE" || ctx.contentType === "CTA") {
      const pool =
        ctx.contentType === "HEADLINE"
          ? TITLE_ANGLES.map((fn) => fn(ctx.businessName, ctx.product, ctx.location))
          : (CTA_BY_OBJECTIVE[ctx.objective ?? "default"] ?? CTA_BY_OBJECTIVE.default).concat(
              CTA_BY_OBJECTIVE.default
            );
      const variations = Array.from(new Set(pool)).slice(0, 5);
      return {
        text: JSON.stringify({ variations }),
        provider: this.id,
        model: "template-v1",
        isFallback: true,
      };
    }

    if (ctx.platform === "XIAOHONGSHU") {
      const out = buildXiaohongshuOutput(ctx, seed);
      return { text: JSON.stringify(out), provider: this.id, model: "template-v1", isFallback: true };
    }

    const out = buildDefaultOutput(ctx, seed);
    return { text: JSON.stringify(out), provider: this.id, model: "template-v1", isFallback: true };
  }
}
