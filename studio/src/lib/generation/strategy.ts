import { prisma } from "@/lib/db/prisma";
import { generateRawText } from "@/lib/ai";
import { toJsonInput } from "@/lib/db/json";
import type { Campaign } from "@prisma/client";

export interface AudienceProfile {
  demographics: string;
  interests: string;
  painPoints: string;
  buyingMotivations: string;
  contentPreferences: string;
}

export interface Positioning {
  brandPositioning: string;
  usp: string;
  keyMessage: string;
  differentiation: string;
}

export interface PlatformRecommendation {
  platform: string;
  reason: string;
}

export interface StrategyResult {
  audienceProfile: AudienceProfile;
  positioning: Positioning;
  contentPillars: string[];
  recommendedPlatforms: PlatformRecommendation[];
}

const OBJECTIVE_LABELS: Record<string, string> = {
  BRAND_AWARENESS: "Brand Awareness",
  LEAD_GENERATION: "Lead Generation",
  SALES: "Sales",
  ENGAGEMENT: "Engagement",
  TRAFFIC: "Traffic",
  RECRUITMENT: "Recruitment",
  PRODUCT_LAUNCH: "Product Launch",
  EVENT_PROMOTION: "Event Promotion",
};

function briefSummary(c: Campaign): string {
  const lines = [
    `Campaign name: ${c.name}`,
    c.businessName ? `Business: ${c.businessName}` : "",
    c.industry ? `Industry: ${c.industry}` : "",
    c.product ? `Product/service: ${c.product}` : "",
    c.location ? `Location: ${c.location}` : "",
    c.targetAudience ? `Stated target audience: ${c.targetAudience}` : "",
    c.objective ? `Objective: ${OBJECTIVE_LABELS[c.objective]}` : "",
    c.budget ? `Budget: ${c.budget}` : "",
    c.promotion ? `Promotion/offer: ${c.promotion}` : "",
    c.startDate ? `Start date: ${c.startDate.toISOString().slice(0, 10)}` : "",
    c.endDate ? `End date: ${c.endDate.toISOString().slice(0, 10)}` : "",
    c.sellingPoints.length ? `Selling points: ${c.sellingPoints.join(", ")}` : "",
    c.competitors.length ? `Competitors: ${c.competitors.join(", ")}` : "",
    c.brandTone ? `Brand tone: ${c.brandTone}` : "",
    c.brandGuidelines ? `Brand guidelines: ${c.brandGuidelines}` : "",
    c.platforms.length ? `Platforms already in mind: ${c.platforms.join(", ")}` : "",
    c.additionalNotes ? `Additional notes: ${c.additionalNotes}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a senior marketing strategist. Given a campaign brief, produce a concise, actionable strategy — not generic marketing platitudes. Ground every recommendation in the specific business, industry, and audience given.`;

function buildUserPrompt(c: Campaign): string {
  return [
    briefSummary(c),
    "",
    "Return strict JSON, no markdown fences, no commentary, in this exact shape:",
    `{
  "audienceProfile": {
    "demographics": string,
    "interests": string,
    "painPoints": string,
    "buyingMotivations": string,
    "contentPreferences": string
  },
  "positioning": {
    "brandPositioning": string,
    "usp": string,
    "keyMessage": string,
    "differentiation": string
  },
  "contentPillars": string[],        // 4-6 pillars, e.g. "Educational", "Promotional", "Social Proof", "Behind the Scenes", "Storytelling" — tailored to this business, not the generic list
  "recommendedPlatforms": [
    { "platform": "XIAOHONGSHU" | "TIKTOK" | "INSTAGRAM" | "FACEBOOK" | "LINKEDIN", "reason": string }
  ]              // rank 2-4 platforms most suited to this campaign, each with a one-sentence reason specific to this brief
}`,
  ].join("\n");
}

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

function coerce(raw: Record<string, unknown> | null, fallback: StrategyResult): StrategyResult {
  if (!raw) return fallback;
  const ap = raw.audienceProfile as Partial<AudienceProfile> | undefined;
  const pos = raw.positioning as Partial<Positioning> | undefined;
  return {
    audienceProfile: {
      demographics: ap?.demographics || fallback.audienceProfile.demographics,
      interests: ap?.interests || fallback.audienceProfile.interests,
      painPoints: ap?.painPoints || fallback.audienceProfile.painPoints,
      buyingMotivations: ap?.buyingMotivations || fallback.audienceProfile.buyingMotivations,
      contentPreferences: ap?.contentPreferences || fallback.audienceProfile.contentPreferences,
    },
    positioning: {
      brandPositioning: pos?.brandPositioning || fallback.positioning.brandPositioning,
      usp: pos?.usp || fallback.positioning.usp,
      keyMessage: pos?.keyMessage || fallback.positioning.keyMessage,
      differentiation: pos?.differentiation || fallback.positioning.differentiation,
    },
    contentPillars: Array.isArray(raw.contentPillars) && raw.contentPillars.length ? (raw.contentPillars as string[]) : fallback.contentPillars,
    recommendedPlatforms: Array.isArray(raw.recommendedPlatforms) && raw.recommendedPlatforms.length
      ? (raw.recommendedPlatforms as PlatformRecommendation[])
      : fallback.recommendedPlatforms,
  };
}

const PLATFORM_REASONS: Record<string, (c: Campaign) => string> = {
  XIAOHONGSHU: (c) => `Strong fit for ${c.industry || "this industry"} discovery content and word-of-mouth trust-building${c.location ? ` with a ${c.location} audience` : ""}.`,
  TIKTOK: () => "Short-form video reaches new audiences fast and suits behind-the-scenes and storytelling content pillars.",
  INSTAGRAM: () => "Visual-first platform that works well for product/service showcases and community engagement.",
  FACEBOOK: (c) => `Good for reaching a broader, more local audience${c.location ? ` around ${c.location}` : ""} and running promotions.`,
  LINKEDIN: (c) => (c.objective === "RECRUITMENT" ? "Best-suited platform for recruitment content and employer branding." : "Useful if there's a B2B or professional-services angle to this campaign."),
};

function buildTemplateStrategy(c: Campaign): StrategyResult {
  const industry = c.industry || "this business";
  const audience = c.targetAudience || `people interested in ${c.product || industry}`;
  const platforms = (c.platforms.length ? c.platforms : ["INSTAGRAM", "FACEBOOK", "XIAOHONGSHU"]).slice(0, 4);

  return {
    audienceProfile: {
      demographics: `${audience}${c.location ? `, based in or around ${c.location}` : ""}.`,
      interests: `Likely to follow ${industry.toLowerCase()} accounts, local recommendations, and content from brands with a similar tone to ${c.brandTone || "yours"}.`,
      painPoints: c.competitors.length
        ? `Choosing between options like ${c.competitors.slice(0, 2).join(" and ")} without a clear reason to pick one over another.`
        : `Not knowing which ${industry.toLowerCase()} option is actually worth their time or money.`,
      buyingMotivations: c.sellingPoints.length ? `Responds to: ${c.sellingPoints.slice(0, 3).join(", ")}.` : "Values trust, social proof, and a clear, specific offer.",
      contentPreferences: "Short-form, visual-first content with a genuine, non-salesy voice performs best with this audience.",
    },
    positioning: {
      brandPositioning: `${c.businessName || c.name} as a ${c.brandTone ? c.brandTone.toLowerCase() + ", " : ""}trustworthy choice in ${industry.toLowerCase()}${c.location ? ` for ${c.location}` : ""}.`,
      usp: c.sellingPoints[0] || `What sets ${c.businessName || c.name} apart from other ${industry.toLowerCase()} options.`,
      keyMessage: c.promotion ? `${c.promotion} — from a name people can trust.` : `${c.businessName || c.name} delivers on ${industry.toLowerCase()} the way it should be.`,
      differentiation: c.competitors.length ? `Unlike ${c.competitors[0]}, ${c.businessName || c.name} leads with ${c.sellingPoints[0] || "a clearer value proposition"}.` : "Leads with authenticity over polish.",
    },
    contentPillars: ["Educational", "Promotional", "Social Proof", "Behind the Scenes", "Storytelling"],
    recommendedPlatforms: platforms.map((p) => ({ platform: p, reason: (PLATFORM_REASONS[p] ?? (() => "Fits this campaign's audience and content style."))(c) })),
  };
}

export interface StrategyOutcome {
  strategy: StrategyResult;
  provider: string;
  isFallback: boolean;
  fallbackReason?: string;
}

export async function generateStrategy(userId: string, campaign: Campaign): Promise<StrategyOutcome> {
  const fallback = buildTemplateStrategy(campaign);
  const started = Date.now();
  const outcome = await generateRawText(SYSTEM_PROMPT, buildUserPrompt(campaign));

  const strategy = outcome.result ? coerce(safeParseJson(outcome.result.text), fallback) : fallback;
  const isFallback = !outcome.result;
  const provider = outcome.result?.provider ?? "template";

  await prisma.generationHistory.create({
    data: {
      userId,
      type: "TEXT",
      provider,
      model: outcome.result?.model ?? "template-v1",
      status: isFallback ? "FALLBACK" : "SUCCESS",
      promptTokens: outcome.result?.promptTokens,
      completionTokens: outcome.result?.completionTokens,
      errorMessage: outcome.error,
      durationMs: Date.now() - started,
    },
  });

  await prisma.marketingStrategy.upsert({
    where: { campaignId: campaign.id },
    update: {
      audienceProfile: toJsonInput(strategy.audienceProfile),
      positioning: toJsonInput(strategy.positioning),
      contentPillars: strategy.contentPillars,
      recommendedPlatforms: toJsonInput(strategy.recommendedPlatforms),
    },
    create: {
      campaignId: campaign.id,
      audienceProfile: toJsonInput(strategy.audienceProfile),
      positioning: toJsonInput(strategy.positioning),
      contentPillars: strategy.contentPillars,
      recommendedPlatforms: toJsonInput(strategy.recommendedPlatforms),
    },
  });

  return { strategy, provider, isFallback, fallbackReason: outcome.error };
}
