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
  PRODUCT_DESCRIPTION: "Product Description",
  VIDEO_SCRIPT: "Video Script",
  PROMOTIONAL_COPY: "Promotional Copy",
  HEADLINE: "Headline",
  CTA: "Call-to-Action",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};
