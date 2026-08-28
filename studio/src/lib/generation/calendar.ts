import { prisma } from "@/lib/db/prisma";
import { generateRawText } from "@/lib/ai";
import type { Campaign, ContentType, Platform } from "@prisma/client";

export interface CalendarItemDraft {
  date: string; // ISO date, YYYY-MM-DD
  platform: string;
  contentPillar: string;
  topic: string;
  keyMessage: string;
}

const PILLAR_TO_CONTENT_TYPE: Record<string, ContentType> = {
  educational: "EDUCATIONAL_POST",
  promotional: "PROMOTIONAL_COPY",
  "social proof": "REVIEW",
  review: "REVIEW",
  "behind the scenes": "STORYTELLING",
  storytelling: "STORYTELLING",
  recruitment: "RECRUITMENT",
};

function contentTypeForPillar(pillar: string): ContentType {
  return PILLAR_TO_CONTENT_TYPE[pillar.trim().toLowerCase()] ?? "SOCIAL_POST";
}

function dateRange(campaign: Campaign): { start: Date; end: Date } {
  const start = campaign.startDate ?? new Date();
  const end = campaign.endDate ?? new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  return { start, end };
}

const SYSTEM_PROMPT = `You are a social media content planner. Given a campaign brief, its strategy, and a posting cadence, produce a concrete content calendar — specific topics tied to this business, not generic placeholders like "Post 1".`;

function buildUserPrompt(campaign: Campaign, pillars: string[], platforms: string[], postsPerWeek: number): string {
  const { start, end } = dateRange(campaign);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const totalPosts = Math.max(3, Math.min(40, Math.round((days / 7) * postsPerWeek)));

  return [
    `Business: ${campaign.businessName || campaign.name}`,
    campaign.industry ? `Industry: ${campaign.industry}` : "",
    campaign.product ? `Product/service: ${campaign.product}` : "",
    `Campaign runs ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}.`,
    `Platforms to use: ${platforms.join(", ")}`,
    `Content pillars to rotate through: ${pillars.join(", ")}`,
    `Target roughly ${postsPerWeek} posts per week — produce exactly ${totalPosts} calendar items total, spread across the date range (not all on the same day).`,
    "",
    "Return strict JSON, no markdown fences, no commentary, in this exact shape:",
    `{
  "items": [
    { "date": "YYYY-MM-DD", "platform": "one of: ${platforms.join(" | ")}", "contentPillar": "one of: ${pillars.join(" | ")}", "topic": string, "keyMessage": string }
  ]
}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function safeParseJson(text: string): { items?: unknown[] } | null {
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

function buildTemplateCalendar(campaign: Campaign, pillars: string[], platforms: string[], postsPerWeek: number): CalendarItemDraft[] {
  const { start, end } = dateRange(campaign);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const totalPosts = Math.max(3, Math.min(40, Math.round((days / 7) * postsPerWeek)));
  const intervalDays = Math.max(1, Math.floor(days / totalPosts));

  const TOPIC_BY_PILLAR: Record<string, (c: Campaign) => string> = {
    educational: (c) => `What to know before choosing ${c.product || c.industry || "us"}`,
    promotional: (c) => (c.promotion ? c.promotion : `Why now is the time to try ${c.product || c.businessName || "this"}`),
    "social proof": (c) => `What customers are saying about ${c.businessName || c.name}`,
    review: (c) => `A real review of ${c.product || c.businessName || "the experience"}`,
    "behind the scenes": (c) => `A look behind the scenes at ${c.businessName || c.name}`,
    storytelling: (c) => `The story behind ${c.businessName || c.name}`,
    recruitment: (c) => `We're hiring — life at ${c.businessName || c.name}`,
  };

  const items: CalendarItemDraft[] = [];
  for (let i = 0; i < totalPosts; i++) {
    const date = new Date(start.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
    const pillar = pillars[i % pillars.length];
    const platform = platforms[i % platforms.length];
    const topicFn = TOPIC_BY_PILLAR[pillar.trim().toLowerCase()];
    const topic = topicFn ? topicFn(campaign) : `${pillar} post about ${campaign.product || campaign.businessName || campaign.name}`;
    items.push({
      date: date.toISOString().slice(0, 10),
      platform,
      contentPillar: pillar,
      topic,
      keyMessage: campaign.sellingPoints[0] || topic,
    });
  }
  return items;
}

export interface CalendarOutcome {
  items: CalendarItemDraft[];
  provider: string;
  isFallback: boolean;
  fallbackReason?: string;
}

export async function generateCalendarPlan(
  campaign: Campaign,
  pillars: string[],
  platforms: string[],
  postsPerWeek: number
): Promise<CalendarOutcome> {
  const fallback = buildTemplateCalendar(campaign, pillars, platforms, postsPerWeek);
  const outcome = await generateRawText(SYSTEM_PROMPT, buildUserPrompt(campaign, pillars, platforms, postsPerWeek));

  if (!outcome.result) {
    return { items: fallback, provider: "template", isFallback: true, fallbackReason: outcome.error };
  }

  const parsed = safeParseJson(outcome.result.text);
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : null;
  if (!rawItems || !rawItems.length) {
    return { items: fallback, provider: outcome.result.provider, isFallback: true, fallbackReason: "AI response could not be parsed" };
  }

  const items: CalendarItemDraft[] = rawItems
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((r) => ({
      date: typeof r.date === "string" ? r.date : fallback[0]?.date,
      platform: typeof r.platform === "string" ? r.platform : platforms[0],
      contentPillar: typeof r.contentPillar === "string" ? r.contentPillar : pillars[0],
      topic: typeof r.topic === "string" ? r.topic : "Untitled post",
      keyMessage: typeof r.keyMessage === "string" ? r.keyMessage : "",
    }));

  return { items, provider: outcome.result.provider, isFallback: false };
}

export async function persistCalendarItems(userId: string, campaign: Campaign, items: CalendarItemDraft[]) {
  const validPlatforms = new Set(campaign.platforms.length ? campaign.platforms : ["INSTAGRAM", "FACEBOOK", "XIAOHONGSHU", "TIKTOK", "LINKEDIN"]);

  const created = await prisma.$transaction(
    items.map((item) => {
      const platform = (validPlatforms.has(item.platform as Platform) ? item.platform : campaign.platforms[0] || "CUSTOM") as Platform;
      const contentType = contentTypeForPillar(item.contentPillar);
      const scheduledDate = new Date(item.date);
      return prisma.content.create({
        data: {
          userId,
          campaignId: campaign.id,
          title: item.topic,
          platform,
          industry: campaign.industry,
          contentType,
          targetAudience: campaign.targetAudience,
          status: "IDEA",
          contentPillar: item.contentPillar,
          scheduledDate: isNaN(scheduledDate.getTime()) ? null : scheduledDate,
          body: item.keyMessage || item.topic,
          currentVersionNumber: 1,
          versions: {
            create: {
              versionNumber: 1,
              title: item.topic,
              body: item.keyMessage || item.topic,
              changeNote: "Added to content calendar",
            },
          },
        },
      });
    })
  );
  return created;
}
