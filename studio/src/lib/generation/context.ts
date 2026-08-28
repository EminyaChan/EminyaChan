import type { Brand } from "@prisma/client";
import type { GenerationContext, BrandContext } from "@/lib/ai";
import type { z } from "zod";
import type { generateContentSchema } from "@/lib/validation/schemas";

export function brandToContext(brand: Brand | null): BrandContext | undefined {
  if (!brand) return undefined;
  return {
    name: brand.name,
    description: brand.description ?? undefined,
    voice: brand.voice ?? undefined,
    sellingPoints: brand.sellingPoints,
    forbiddenWords: brand.forbiddenWords,
    preferredCta: brand.preferredCta ?? undefined,
    website: brand.website ?? undefined,
  };
}

type GenerateInput = z.infer<typeof generateContentSchema>;

export function inputToContext(input: GenerateInput, brand: Brand | null): GenerationContext {
  return {
    businessName: input.businessName,
    industry: input.industry,
    product: input.product,
    productDescription: input.productDescription || undefined,
    targetAudience: input.targetAudience || brand?.targetAudience || undefined,
    location: input.location || undefined,
    sellingPoints: input.sellingPoints || undefined,
    promotion: input.promotion || undefined,
    websiteUrl: input.websiteUrl || brand?.website || undefined,
    platform: input.platform,
    contentType: input.contentType,
    tone: input.tone,
    language: input.language,
    length: input.length,
    objective: input.objective || undefined,
    specialInstructions: input.specialInstructions || undefined,
    brand: brandToContext(brand),
  };
}
