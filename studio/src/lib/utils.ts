import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const PLATFORM_LABELS: Record<string, string> = {
  XIAOHONGSHU: "Xiaohongshu",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  GOOGLE_ADS: "Google Ads",
  CUSTOM: "Custom",
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  SOCIAL_POST: "Social Post",
  ADVERTISEMENT: "Advertisement",
  PRODUCT_DESCRIPTION: "Product Introduction",
  VIDEO_SCRIPT: "Short Video Script",
  PROMOTIONAL_COPY: "Promotional Post",
  HEADLINE: "Headline",
  CTA: "Call-to-Action",
  EDUCATIONAL_POST: "Educational Post",
  STORYTELLING: "Storytelling",
  RECRUITMENT: "Recruitment",
  REVIEW: "Review",
  CAMPAIGN_POST: "Campaign",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  IDEA: "Idea",
  AI_GENERATED: "AI Generated",
  EDITING: "Editing",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
};

export const OBJECTIVE_LABELS: Record<string, string> = {
  BRAND_AWARENESS: "Brand Awareness",
  LEAD_GENERATION: "Lead Generation",
  SALES: "Sales",
  ENGAGEMENT: "Engagement",
  TRAFFIC: "Traffic",
  RECRUITMENT: "Recruitment",
  PRODUCT_LAUNCH: "Product Launch",
  EVENT_PROMOTION: "Event Promotion",
};
