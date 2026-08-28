import OpenAI from "openai";
import type {
  AIImageProvider,
  AITextProvider,
  GenerationContext,
  ImageGenerationRequest,
  ImageGenerationResult,
  TextGenerationResult,
} from "../types";
import { ProviderCallError } from "../types";
import { buildPrompt } from "../../prompt/builder";

export class OpenAITextProvider implements AITextProvider {
  readonly id = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateText(ctx: GenerationContext): Promise<TextGenerationResult> {
    const { systemPrompt, userPrompt } = buildPrompt(ctx);
    return this.generateRaw(systemPrompt, userPrompt);
  }

  async generateRaw(systemPrompt: string, userPrompt: string): Promise<TextGenerationResult> {
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.9,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const text = res.choices[0]?.message?.content ?? "";
      return {
        text,
        provider: this.id,
        model: this.model,
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        isFallback: false,
      };
    } catch (err) {
      throw new ProviderCallError(this.id, err);
    }
  }
}

export class OpenAIImageProvider implements AIImageProvider {
  readonly id = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      const size = aspectRatioToSize(req.aspectRatio);
      const res = await this.client.images.generate({
        model: this.model,
        prompt: buildImagePrompt(req),
        size,
        n: 1,
      });
      const b64 = res.data?.[0]?.b64_json;
      const url = res.data?.[0]?.url;
      if (b64) {
        return { url: `data:image/png;base64,${b64}`, provider: this.id, model: this.model };
      }
      if (url) {
        return { url, provider: this.id, model: this.model };
      }
      throw new Error("No image data returned");
    } catch (err) {
      throw new ProviderCallError(this.id, err);
    }
  }
}

function buildImagePrompt(req: ImageGenerationRequest): string {
  const parts = [req.prompt];
  if (req.style) parts.push(`Style: ${req.style}.`);
  if (req.textOverlay) parts.push(`Include this text in the image: "${req.textOverlay}".`);
  parts.push("High quality, professional marketing photography, no watermarks.");
  return parts.join(" ");
}

function aspectRatioToSize(ratio: string): "1024x1024" | "1024x1536" | "1536x1024" {
  // gpt-image-1 supports square, portrait, landscape
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return "1024x1024";
  if (w === h) return "1024x1024";
  return w > h ? "1536x1024" : "1024x1536";
}
