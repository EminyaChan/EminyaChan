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

export interface ContentDTO {
  id: string;
  title: string;
  platform: string;
  industry: string | null;
  contentType: string;
  targetAudience: string | null;
  status: "DRAFT" | "GENERATED" | "PUBLISHED" | "ARCHIVED";
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
  versions?: ContentVersionDTO[];
  images?: GeneratedImageDTO[];
  videos?: GeneratedVideoDTO[];
}

export interface CampaignDTO {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  platforms: string[];
  createdAt: string;
  updatedAt: string;
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
