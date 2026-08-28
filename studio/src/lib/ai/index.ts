import type {
  AIImageProvider,
  AITextProvider,
  AIVideoProvider,
  GenerationContext,
  ImageGenerationRequest,
  ImageGenerationResult,
  TextGenerationResult,
} from "./types";
import { ProviderCallError } from "./types";
import { OpenAITextProvider, OpenAIImageProvider } from "./providers/openai";
import { AnthropicTextProvider } from "./providers/anthropic";
import { GeminiTextProvider } from "./providers/gemini";
import { TemplateTextProvider } from "./providers/template";
import { UnconfiguredVideoProvider } from "./providers/video";

export type { GenerationContext, BrandContext } from "./types";
export { ProviderCallError, ProviderNotConfiguredError } from "./types";

function resolveTextProvider(preferred?: string | null): AITextProvider | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  const candidates: Record<string, () => AITextProvider | null> = {
    openai: () => (openaiKey ? new OpenAITextProvider(openaiKey, process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini") : null),
    anthropic: () =>
      anthropicKey ? new AnthropicTextProvider(anthropicKey, process.env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-5") : null,
    gemini: () => (geminiKey ? new GeminiTextProvider(geminiKey, process.env.GOOGLE_TEXT_MODEL || "gemini-1.5-flash") : null),
  };

  const order = preferred
    ? [preferred, ...Object.keys(candidates).filter((k) => k !== preferred)]
    : [process.env.AI_TEXT_PROVIDER, "openai", "anthropic", "gemini"].filter(Boolean) as string[];

  for (const key of order) {
    const factory = candidates[key];
    const instance = factory?.();
    if (instance) return instance;
  }
  return null;
}

function resolveImageProvider(): AIImageProvider | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  if ((process.env.AI_IMAGE_PROVIDER ?? "openai") === "openai" && openaiKey) {
    return new OpenAIImageProvider(openaiKey, process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
  }
  return null;
}

function resolveVideoProvider(): AIVideoProvider {
  // Placeholder until a real video-rendering provider is connected.
  return new UnconfiguredVideoProvider();
}

export interface GenerateTextOptions {
  preferredProvider?: string | null;
}

export interface GenerateTextOutcome extends TextGenerationResult {
  /** Set when a configured real provider failed and we fell back to the template */
  fallbackReason?: string;
}

/**
 * Generates text, preferring a real AI provider when configured, and
 * automatically falling back to the deterministic template provider if
 * none is configured or the call fails — the caller always gets usable
 * content, and generation history records which path was actually taken.
 */
export async function generateText(ctx: GenerationContext, opts: GenerateTextOptions = {}): Promise<GenerateTextOutcome> {
  const provider = resolveTextProvider(opts.preferredProvider);
  if (!provider) {
    const result = await new TemplateTextProvider().generateText(ctx);
    return { ...result, fallbackReason: "No AI provider configured (OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY)" };
  }
  try {
    return await provider.generateText(ctx);
  } catch (err) {
    const result = await new TemplateTextProvider().generateText(ctx);
    const message = err instanceof ProviderCallError ? err.message : String(err);
    return { ...result, fallbackReason: message };
  }
}

export interface GenerateRawTextOutcome {
  result?: TextGenerationResult;
  error?: string;
  configured: boolean;
}

/**
 * Raw-prompt counterpart to generateText, for callers (marketing strategy,
 * content calendar) that build their own system/user prompt instead of a
 * GenerationContext. Unlike generateText, this does NOT fall back to the
 * generic template provider on failure/no-config — the caller is expected
 * to have its own domain-specific fallback, since a strategy or calendar
 * fallback needs campaign fields, not a flattened prompt string.
 */
export async function generateRawText(systemPrompt: string, userPrompt: string, opts: GenerateTextOptions = {}): Promise<GenerateRawTextOutcome> {
  const provider = resolveTextProvider(opts.preferredProvider);
  if (!provider) {
    return { configured: false, error: "No AI provider configured (OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY)" };
  }
  try {
    const result = await provider.generateRaw(systemPrompt, userPrompt);
    return { configured: true, result };
  } catch (err) {
    const message = err instanceof ProviderCallError ? err.message : String(err);
    return { configured: true, error: message };
  }
}

export interface GenerateImageOutcome {
  result?: ImageGenerationResult;
  error?: string;
  configured: boolean;
}

export async function generateImage(req: ImageGenerationRequest): Promise<GenerateImageOutcome> {
  const provider = resolveImageProvider();
  if (!provider) {
    return {
      configured: false,
      error:
        "No image generation provider is configured. Set OPENAI_API_KEY (and optionally OPENAI_IMAGE_MODEL) to enable AI image generation.",
    };
  }
  try {
    const result = await provider.generateImage(req);
    return { configured: true, result };
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface GenerateVideoAssetOutcome {
  configured: boolean;
  error: string;
}

export async function generateVideoAsset(): Promise<GenerateVideoAssetOutcome> {
  const provider = resolveVideoProvider();
  try {
    await provider.generateVideo({ title: "", plan: {}, aspectRatio: "9:16", durationSeconds: 15 });
    return { configured: true, error: "" };
  } catch (err) {
    return { configured: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function isRealTextProviderConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function isImageProviderConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
