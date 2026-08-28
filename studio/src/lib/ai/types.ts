// Provider-agnostic contracts. Every AI capability (text/image/video) is
// implemented per-provider behind these interfaces so the rest of the app
// never talks to OpenAI/Anthropic/Gemini SDKs directly.

export interface BrandContext {
  name?: string;
  description?: string;
  voice?: string;
  sellingPoints?: string[];
  forbiddenWords?: string[];
  preferredCta?: string;
  website?: string;
}

export interface GenerationContext {
  businessName: string;
  industry: string;
  product: string;
  productDescription?: string;
  targetAudience?: string;
  location?: string;
  sellingPoints?: string;
  promotion?: string;
  websiteUrl?: string;
  platform: string;
  contentType: string;
  tone: string;
  language: string;
  length: "short" | "medium" | "long";
  objective?: string;
  specialInstructions?: string;
  brand?: BrandContext;
  /** For section-level regeneration, e.g. "hook" | "title" | "cta" | "content" */
  focusSection?: string;
  /** Existing content, provided when regenerating a single section for context */
  existingContent?: Record<string, unknown>;
}

export interface TextGenerationResult {
  text: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  /** true when a real AI provider was NOT used and this is the deterministic template fallback */
  isFallback: boolean;
}

export interface ImageGenerationRequest {
  prompt: string;
  style?: string;
  aspectRatio: string; // e.g. "1:1", "4:5", "9:16", "3:4", "16:9"
  textOverlay?: string;
}

export interface ImageGenerationResult {
  url: string;
  provider: string;
  model: string;
}

export interface VideoGenerationRequest {
  title: string;
  plan: unknown;
  aspectRatio: string;
  durationSeconds: number;
}

export interface VideoGenerationResult {
  url: string;
  provider: string;
  model: string;
}

export class ProviderNotConfiguredError extends Error {
  constructor(capability: "text" | "image" | "video", public envVars: string[]) {
    super(
      `No ${capability} generation provider is configured. Set one of: ${envVars.join(", ")}`
    );
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderCallError extends Error {
  constructor(public provider: string, public cause_: unknown) {
    super(`${provider} request failed: ${cause_ instanceof Error ? cause_.message : String(cause_)}`);
    this.name = "ProviderCallError";
  }
}

export interface AITextProvider {
  readonly id: string;
  generateText(ctx: GenerationContext): Promise<TextGenerationResult>;
}

export interface AIImageProvider {
  readonly id: string;
  generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export interface AIVideoProvider {
  readonly id: string;
  generateVideo(req: VideoGenerationRequest): Promise<VideoGenerationResult>;
}
