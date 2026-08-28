import type { GenerationContext } from "../ai/types";

// Modular prompt builder: each function contributes one piece, composed
// into a final { systemPrompt, userPrompt } pair. Nothing here is a single
// giant hard-coded prompt — each concern (platform, tone, industry, brand,
// language) is its own small block so it can be reused, tested, or swapped
// independently (e.g. by the Xiaohongshu-specific builder).

const PLATFORM_GUIDANCE: Record<string, string> = {
  XIAOHONGSHU:
    "Write natively for Xiaohongshu (小红书), for a Malaysian Chinese-speaking audience specifically. Do NOT translate Western ad copy into Chinese — write the way real Malaysian Xiaohongshu creators write: personal, first-person, discovery-toned, comfortable mixing in English brand/product terms and the occasional local touch the way Malaysians naturally code-switch, with emoji used naturally (not excessively), short punchy paragraphs, and a title under 20 characters designed to be clicked. Avoid Mainland-China-specific slang that wouldn't read naturally in Malaysia, and avoid stiff, overly formal or robotic-sounding AI phrasing.",
  INSTAGRAM:
    "Write for Instagram: visually descriptive, concise, with a strong first line since captions get truncated. Use line breaks for readability.",
  FACEBOOK:
    "Write for Facebook: slightly longer-form and conversational, works well with a clear value proposition and community tone.",
  TIKTOK:
    "Write for TikTok: extremely punchy, hook-first, casual and high-energy, written to be read aloud or overlaid as on-screen text.",
  LINKEDIN:
    "Write for LinkedIn: professional but human, value-driven, avoid hype language, credible tone.",
  GOOGLE_ADS:
    "Write for Google Ads: tight character limits, benefit-led headlines, direct and keyword-relevant.",
  CUSTOM: "Write flexible general-purpose marketing copy suited to the described platform.",
};

const CONTENT_TYPE_GUIDANCE: Record<string, string> = {
  SOCIAL_POST: "a social media post",
  ADVERTISEMENT: "paid advertisement copy designed to convert",
  PRODUCT_DESCRIPTION: "a product introduction for a listing or storefront",
  VIDEO_SCRIPT: "a short video script broken into a hook, scenes, and a CTA",
  PROMOTIONAL_COPY: "a promotional post announcing an offer or discount",
  HEADLINE: "a set of punchy marketing headlines",
  CTA: "a set of call-to-action lines",
  EDUCATIONAL_POST: "an educational post that teaches the audience something useful and ties it back to the business",
  STORYTELLING: "a storytelling post — a narrative moment (origin story, behind-the-scenes, a customer's journey) that builds an emotional connection",
  RECRUITMENT: "a recruitment post for an open role, written to attract qualified candidates and reflect what it's actually like to work there",
  REVIEW: "a review-style post — either highlighting a real customer review or written in a review/testimonial voice",
  CAMPAIGN_POST: "a post for a specific marketing campaign, tied to that campaign's theme and offer",
};

const LENGTH_GUIDANCE: Record<GenerationContext["length"], string> = {
  short: "Keep it brief: 1-2 short paragraphs or under 80 words.",
  medium: "Medium length: 2-4 paragraphs, roughly 80-180 words.",
  long: "Longer form: thorough, roughly 180-350 words, still scannable.",
};

function brandBlock(ctx: GenerationContext): string {
  const b = ctx.brand;
  if (!b) return "";
  const lines = [`Brand: ${b.name ?? ctx.businessName}`];
  if (b.description) lines.push(`Brand description: ${b.description}`);
  if (b.voice) lines.push(`Brand voice to follow: ${b.voice}`);
  if (b.sellingPoints?.length) lines.push(`Key selling points to weave in: ${b.sellingPoints.join(", ")}`);
  if (b.preferredCta) lines.push(`Preferred call-to-action style: ${b.preferredCta}`);
  if (b.forbiddenWords?.length) lines.push(`NEVER use these words/phrases: ${b.forbiddenWords.join(", ")}`);
  return lines.join("\n");
}

function businessBlock(ctx: GenerationContext): string {
  const lines = [
    `Business name: ${ctx.businessName}`,
    `Industry: ${ctx.industry}`,
    `Product/service: ${ctx.product}`,
  ];
  if (ctx.productDescription) lines.push(`Product description: ${ctx.productDescription}`);
  if (ctx.targetAudience) lines.push(`Target audience: ${ctx.targetAudience}`);
  if (ctx.location) lines.push(`Location: ${ctx.location}`);
  if (ctx.sellingPoints) lines.push(`Main selling points: ${ctx.sellingPoints}`);
  if (ctx.promotion) lines.push(`Current promotion/offer: ${ctx.promotion}`);
  if (ctx.websiteUrl) lines.push(`Website/social: ${ctx.websiteUrl}`);
  return lines.join("\n");
}

export function buildSystemPrompt(ctx: GenerationContext): string {
  const parts = [
    "You are an expert marketing copywriter who writes native, platform-authentic content — never generic AI-sounding copy, never a literal translation between languages.",
    PLATFORM_GUIDANCE[ctx.platform] ?? PLATFORM_GUIDANCE.CUSTOM,
    `Tone: ${ctx.tone}.`,
    `Write in: ${ctx.language}.`,
    LENGTH_GUIDANCE[ctx.length],
    ctx.objective ? `Marketing objective: ${ctx.objective}.` : "",
    "Avoid clichés like 'game-changer', 'unlock', 'elevate your' unless the brand voice explicitly calls for them.",
  ];
  return parts.filter(Boolean).join("\n");
}

export function buildUserPrompt(ctx: GenerationContext): string {
  const parts = [
    `Generate ${CONTENT_TYPE_GUIDANCE[ctx.contentType] ?? "marketing content"}.`,
    "",
    "--- Business information ---",
    businessBlock(ctx),
  ];
  const brand = brandBlock(ctx);
  if (brand) {
    parts.push("", "--- Brand profile ---", brand);
  }
  if (ctx.specialInstructions) {
    parts.push("", "--- Special instructions ---", ctx.specialInstructions);
  }
  if (ctx.focusSection && ctx.existingContent) {
    parts.push(
      "",
      "--- Regeneration request ---",
      `Only regenerate the "${ctx.focusSection}" section. Keep it consistent with this existing content, which stays unchanged:`,
      JSON.stringify(ctx.existingContent, null, 2)
    );
  }
  parts.push(
    "",
    "--- Output format ---",
    ctx.platform === "XIAOHONGSHU"
      ? xiaohongshuFormatInstructions()
      : defaultFormatInstructions(ctx)
  );
  return parts.join("\n");
}

function defaultFormatInstructions(ctx: GenerationContext): string {
  if (ctx.contentType === "HEADLINE" || ctx.contentType === "CTA") {
    return `Return strict JSON: { "variations": string[] } with 5 distinct options, no extra commentary.`;
  }
  if (ctx.contentType === "VIDEO_SCRIPT") {
    return [
      "Return strict JSON with this exact shape, no markdown fences, no extra commentary:",
      `{
  "title": string,
  "hook": string,
  "scenes": [
    { "visual": string, "dialogue": string, "onScreenText": string },
    { "visual": string, "dialogue": string, "onScreenText": string },
    { "visual": string, "dialogue": string, "onScreenText": string }
  ],
  "cta": string,
  "caption": string,
  "hashtags": string[],
  "thumbnailPrompt": string
}`,
    ].join("\n");
  }
  return [
    "Return strict JSON with this exact shape, no markdown fences, no extra commentary:",
    `{
  "title": string,
  "body": string,
  "cta": string,
  "hashtags": string[]
}`,
  ].join("\n");
}

function xiaohongshuFormatInstructions(): string {
  return [
    "Return strict JSON with this exact shape, no markdown fences, no extra commentary:",
    `{
  "titles": string[],        // 5 clickable title options, different angles: curiosity, listicle, discovery, problem/solution, location-based
  "hook": string,             // opening hook, 1-2 lines, scroll-stopping
  "body": string,             // main content, natural Xiaohongshu voice, short paragraphs, light emoji use
  "introduction": string,     // product/business introduction woven naturally
  "benefits": string[],       // 3-5 key benefits as short bullet-style lines
  "cta": string,
  "hashtags": string[]        // 6-10 relevant Chinese hashtags, no leading # needed
}`,
  ].join("\n");
}

export function buildPrompt(ctx: GenerationContext): { systemPrompt: string; userPrompt: string } {
  return { systemPrompt: buildSystemPrompt(ctx), userPrompt: buildUserPrompt(ctx) };
}
