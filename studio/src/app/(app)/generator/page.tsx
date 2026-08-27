"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { GeneratorForm, EMPTY_FORM, type GeneratorFormValues } from "@/components/generator/GeneratorForm";
import { VariantPicker } from "@/components/generator/VariantPicker";
import { ContentEditor } from "@/components/generator/ContentEditor";
import { GeneratingIndicator } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import type { GeneratedVariant } from "@/lib/generation/service";
import type { ContentDTO } from "@/lib/types";
import { Sparkles } from "lucide-react";

interface GenerateResponse {
  variants: GeneratedVariant[];
  provider: string;
  model: string;
  isFallback: boolean;
  fallbackReason?: string;
  context: Record<string, unknown>;
  brandId: string | null;
}

function extractSaveable(ctxContentType: string, ctxPlatform: string, variant: GeneratedVariant) {
  if (ctxContentType === "VIDEO_SCRIPT" || "scenes" in variant) {
    // Video scripts are saved through the dedicated Video Generator flow, not here.
    return null;
  }
  if ("titles" in variant) {
    return {
      title: variant.titles[0],
      body: variant.body,
      cta: variant.cta,
      hashtags: variant.hashtags,
      sections: { titles: variant.titles, hook: variant.hook, body: variant.body, introduction: variant.introduction, benefits: variant.benefits, cta: variant.cta, hashtags: variant.hashtags },
    };
  }
  if ("variations" in variant) {
    return {
      title: `${ctxContentType === "HEADLINE" ? "Headlines" : "CTAs"} — ${ctxPlatform}`,
      body: variant.variations.join("\n"),
      cta: null,
      hashtags: [] as string[],
      sections: null,
    };
  }
  return { title: variant.title, body: variant.body, cta: variant.cta, hashtags: variant.hashtags, sections: null };
}

function GeneratorPageInner() {
  const searchParams = useSearchParams();
  const presetPlatform = searchParams.get("platform");
  const presetContentType = searchParams.get("contentType");

  const [values, setValues] = useState<GeneratorFormValues>({
    ...EMPTY_FORM,
    platform: presetPlatform || EMPTY_FORM.platform,
    contentType: presetContentType || EMPTY_FORM.contentType,
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [savedContent, setSavedContent] = useState<ContentDTO | null>(null);

  async function handleGenerate() {
    if (!values.businessName || !values.industry || !values.product) {
      toast.error("Business name, industry, and product/service are required.");
      return;
    }
    setGenerating(true);
    setResult(null);
    setSavedContent(null);
    try {
      const res = await apiFetch<GenerateResponse>("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          brandId: values.brandId || null,
        }),
      });
      setResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePick(index: number) {
    if (!result) return;
    const variant = result.variants[index];
    const saveable = extractSaveable(values.contentType, values.platform, variant);
    if (!saveable) {
      toast.error("Video scripts are saved from the Video Generator page.");
      return;
    }
    setSaving(index);
    try {
      const content = await apiFetch<ContentDTO>("/api/content", {
        method: "POST",
        body: JSON.stringify({
          brandId: result.brandId,
          title: saveable.title,
          platform: values.platform,
          industry: values.industry,
          contentType: values.contentType,
          targetAudience: values.targetAudience || null,
          tags: [],
          body: saveable.body,
          cta: saveable.cta,
          hashtags: saveable.hashtags,
          sections: saveable.sections,
          generationInputs: result.context,
        }),
      });
      setSavedContent({ ...content, versions: (content as ContentDTO).versions ?? [] });
      toast.success("Saved to your content library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <GeneratorForm values={values} onChange={setValues} onSubmit={handleGenerate} loading={generating} />

      <div>
        {generating && <GeneratingIndicator label={`Generating your ${values.platform === "XIAOHONGSHU" ? "Xiaohongshu" : ""} content...`} />}

        {!generating && savedContent && <ContentEditor content={savedContent} onChange={setSavedContent} showLibraryLink />}

        {!generating && !savedContent && result && (
          <VariantPicker
            variants={result.variants}
            onPick={handlePick}
            saving={saving}
            provider={result.provider}
            isFallback={result.isFallback}
            fallbackReason={result.fallbackReason}
          />
        )}

        {!generating && !savedContent && !result && (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
            <Sparkles className="size-8" />
            <p className="max-w-xs text-sm">Fill in your business information on the left and click Generate Content to see results here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense>
      <GeneratorPageInner />
    </Suspense>
  );
}
