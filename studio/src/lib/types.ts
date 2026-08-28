export interface ContentVersionDTO {
  id: string;
  versionNumber: number;
  title: string;
  body: string;
  cta: string | null;
  hashtags: string[];
  sections: XhsSections | null;
  changeNote: string | null;
  createdAt: string;
}

export interface XhsSections {
  titles: string[];
  hook: string;
  body: string;
  introduction: string;
  benefits: string[];
  cta: string;
  hashtags: string[];
}

export interface GeneratedImageDTO {
  id: string;
  prompt: string;
  style: string | null;
  aspectRatio: string | null;
  textOverlay: string | null;
  provider: string | null;
  model: string | null;
  url: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  error: string | null;
  createdAt: string;
}

export interface VideoScenePlan {
  visual: string;
  dialogue: string;
  onScreenText: string;
}

export interface VideoPlan {
  title: string;
  hook: string;
  scenes: VideoScenePlan[];
  cta: string;
  caption: string;
  hashtags: string[];
  thumbnailPrompt: string;
}

export interface GeneratedVideoDTO {
  id: string;
  title: string | null;
  plan: VideoPlan;
  caption: string | null;
  hashtags: string[];
  thumbnailPrompt: string | null;
  provider: string | null;
  model: string | null;
  url: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  error: string | null;
  createdAt: string;
}

export type ContentStatus =
  | "DRAFT"
  | "GENERATED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "IDEA"
  | "AI_GENERATED"
  | "EDITING"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SCHEDULED";

export interface ContentDTO {
  id: string;
  title: string;
  platform: string;
  industry: string | null;
  contentType: string;
  targetAudience: string | null;
  status: ContentStatus;
  isFavorite: boolean;
  tags: string[];
  body: string;
  cta: string | null;
  hashtags: string[];
  sections: XhsSections | null;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
  brand?: { id: string; name: string } | null;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  contentPillar?: string | null;
  scheduledDate?: string | null;
  versions?: ContentVersionDTO[];
  images?: GeneratedImageDTO[];
  videos?: GeneratedVideoDTO[];
}

export type CampaignObjective =
  | "BRAND_AWARENESS"
  | "LEAD_GENERATION"
  | "SALES"
  | "ENGAGEMENT"
  | "TRAFFIC"
  | "RECRUITMENT"
  | "PRODUCT_LAUNCH"
  | "EVENT_PROMOTION";

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

export interface MarketingStrategyDTO {
  id: string;
  campaignId: string;
  audienceProfile: AudienceProfile | null;
  positioning: Positioning | null;
  contentPillars: string[];
  recommendedPlatforms: PlatformRecommendation[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDTO {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  platforms: string[];
  businessName: string | null;
  industry: string | null;
  product: string | null;
  location: string | null;
  targetAudience: string | null;
  objective: CampaignObjective | null;
  budget: string | null;
  promotion: string | null;
  startDate: string | null;
  endDate: string | null;
  sellingPoints: string[];
  competitors: string[];
  brandTone: string | null;
  brandColors: string[];
  brandGuidelines: string | null;
  websiteUrl: string | null;
  additionalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  strategy?: MarketingStrategyDTO | { id: string } | null;
  _count?: { contents: number };
  contents?: (ContentDTO & { status: string })[];
}

export interface BrandDTO {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  targetAudience: string | null;
  voice: string | null;
  preferredLanguages: string[];
  preferredPlatforms: string[];
  sellingPoints: string[];
  forbiddenWords: string[];
  preferredCta: string | null;
  website: string | null;
  socialAccounts: Record<string, string> | null;
  isDefault: boolean;
  createdAt: string;
}
