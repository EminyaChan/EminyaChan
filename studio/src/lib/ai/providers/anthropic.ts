import Anthropic from "@anthropic-ai/sdk";
import type { AITextProvider, GenerationContext, TextGenerationResult } from "../types";
import { ProviderCallError } from "../types";
import { buildPrompt } from "../../prompt/builder";

export class AnthropicTextProvider implements AITextProvider {
  readonly id = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateText(ctx: GenerationContext): Promise<TextGenerationResult> {
    const { systemPrompt, userPrompt } = buildPrompt(ctx);
    return this.generateRaw(systemPrompt, userPrompt);
  }

  async generateRaw(systemPrompt: string, userPrompt: string): Promise<TextGenerationResult> {
    try {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: 1400,
        temperature: 0.9,
        system: `${systemPrompt}\n\nRespond with ONLY valid JSON, no markdown fences, no commentary.`,
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return {
        text,
        provider: this.id,
        model: this.model,
        promptTokens: res.usage?.input_tokens,
        completionTokens: res.usage?.output_tokens,
        isFallback: false,
      };
    } catch (err) {
      throw new ProviderCallError(this.id, err);
    }
  }
}
