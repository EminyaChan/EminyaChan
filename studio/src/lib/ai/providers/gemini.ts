import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AITextProvider, GenerationContext, TextGenerationResult } from "../types";
import { ProviderCallError } from "../types";
import { buildPrompt } from "../../prompt/builder";

export class GeminiTextProvider implements AITextProvider {
  readonly id = "gemini";
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async generateText(ctx: GenerationContext): Promise<TextGenerationResult> {
    try {
      const { systemPrompt, userPrompt } = buildPrompt(ctx);
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: `${systemPrompt}\n\nRespond with ONLY valid JSON, no markdown fences.`,
      });
      const res = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1400,
        },
      });
      const text = res.response.text();
      const usage = res.response.usageMetadata;
      return {
        text,
        provider: this.id,
        model: this.model,
        promptTokens: usage?.promptTokenCount,
        completionTokens: usage?.candidatesTokenCount,
        isFallback: false,
      };
    } catch (err) {
      throw new ProviderCallError(this.id, err);
    }
  }
}
