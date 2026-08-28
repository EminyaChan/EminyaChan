import { z } from "zod";

export const platformEnum = z.enum([
  "XIAOHONGSHU",
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "LINKEDIN",
  "GOOGLE_ADS",
  "CUSTOM",
]);

export const contentTypeEnum = z.enum([
  "SOCIAL_POST",
  "ADVERTISEMENT",
  "PRODUCT_DESCRIPTION",
  "VIDEO_SCRIPT",
  "PROMOTIONAL_COPY",
  "HEADLINE",
  "CTA",
  "EDUCATIONAL_POST",
  "STORYTELLING",
  "RECRUITMENT",
  "REVIEW",
  "CAMPAIGN_POST",
]);

export const contentStatusEnum = z.enum([
  "DRAFT",
  "GENERATED",
  "PUBLISHED",
  "ARCHIVED",
  "IDEA",
  "AI_GENERATED",
  "EDITING",
  "PENDING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
]);

export const campaignStatusEnum = z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]);

export const campaignObjectiveEnum = z.enum([
  "BRAND_AWARENESS",
  "LEAD_GENERATION",
  "SALES",
  "ENGAGEMENT",
  "TRAFFIC",
  "RECRUITMENT",
  "PRODUCT_LAUNCH",
  "EVENT_PROMOTION",
]);

const optionalStr = (max: number) => z.string().max(max).optional().or(z.literal(""));

export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  description: optionalStr(2000),
  status: campaignStatusEnum.optional(),
  platforms: z.array(platformEnum).default([]),
  // Marketing brief (Step 1)
  businessName: optionalStr(200),
  industry: optionalStr(100),
  product: optionalStr(200),
  location: optionalStr(200),
  targetAudience: optionalStr(500),
  objective: campaignObjectiveEnum.optional().nullable(),
  budget: optionalStr(100),
  promotion: optionalStr(500),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  sellingPoints: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  brandTone: optionalStr(200),
  brandColors: z.array(z.string()).default([]),
  brandGuidelines: optionalStr(2000),
  websiteUrl: optionalStr(300),
  additionalNotes: optionalStr(2000),
});

export const strategySchema = z.object({
  contentPillars: z.array(z.string()).optional(),
  audienceProfile: z.record(z.string(), z.string()).optional(),
  positioning: z.record(z.string(), z.string()).optional(),
  recommendedPlatforms: z.array(z.object({ platform: z.string(), reason: z.string() })).optional(),
});

export const calendarGenerateSchema = z.object({
  postsPerWeek: z.number().min(1).max(14).default(3),
  platforms: z.array(platformEnum).optional(),
  pillars: z.array(z.string()).optional(),
});

export const calendarItemUpdateSchema = z.object({
  scheduledDate: z.string().nullable().optional(),
  contentPillar: z.string().nullable().optional(),
  platform: platformEnum.optional(),
  contentType: contentTypeEnum.optional(),
  status: contentStatusEnum.optional(),
  title: z.string().min(1).optional(),
});

export const toneEnum = z.enum([
  "Professional",
  "Friendly",
  "Casual",
  "Luxury",
  "Funny",
  "Educational",
  "Emotional",
  "Viral/Social-media style",
]);

export const languageEnum = z.enum([
  "English",
  "Simplified Chinese",
  "Traditional Chinese",
  "Malay",
  "Mixed Chinese + English",
  "Custom",
]);

export const generateContentSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(200),
  industry: z.string().min(1, "Industry is required").max(100),
  product: z.string().min(1, "Product/service is required").max(200),
  productDescription: z.string().max(2000).optional().or(z.literal("")),
  targetAudience: z.string().max(500).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  sellingPoints: z.string().max(1000).optional().or(z.literal("")),
  promotion: z.string().max(500).optional().or(z.literal("")),
  websiteUrl: z.string().max(300).optional().or(z.literal("")),
  platform: platformEnum,
  contentType: contentTypeEnum,
  tone: toneEnum,
  language: languageEnum,
  length: z.enum(["short", "medium", "long"]),
  variations: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  objective: z.string().max(200).optional().or(z.literal("")),
  specialInstructions: z.string().max(1000).optional().or(z.literal("")),
  brandId: z.string().optional().nullable(),
});

export const regenerateSectionSchema = z.object({
  contentId: z.string(),
  section: z.enum(["title", "hook", "content", "cta", "titles", "benefits", "hashtags"]),
});

export const brandSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  targetAudience: z.string().max(500).optional().or(z.literal("")),
  voice: z.string().max(500).optional().or(z.literal("")),
  preferredLanguages: z.array(z.string()).default([]),
  preferredPlatforms: z.array(z.string()).default([]),
  sellingPoints: z.array(z.string()).default([]),
  forbiddenWords: z.array(z.string()).default([]),
  preferredCta: z.string().max(200).optional().or(z.literal("")),
  website: z.string().max(300).optional().or(z.literal("")),
  socialAccounts: z.record(z.string(), z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const imageGenerateSchema = z.object({
  contentId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required").max(1000),
  brand: z.string().max(200).optional().or(z.literal("")),
  platform: z.string().max(100).optional().or(z.literal("")),
  style: z.string().max(100).optional().or(z.literal("")),
  aspectRatio: z.string().min(1),
  textOverlay: z.string().max(200).optional().or(z.literal("")),
});

export const videoGenerateSchema = z.object({
  contentId: z.string().optional().nullable(),
  product: z.string().min(1).max(200),
  objective: z.string().min(1).max(200),
  targetAudience: z.string().max(500).optional().or(z.literal("")),
  platform: platformEnum,
  duration: z.enum(["15s", "30s", "60s"]),
  style: z.string().max(200).optional().or(z.literal("")),
  language: languageEnum,
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
