"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Download } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/Field";
import { GeneratingIndicator } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import { IMAGE_PRESETS, IMAGE_STYLES } from "@/lib/constants";
import type { GeneratedImageDTO } from "@/lib/types";

function ImageGeneratorInner() {
  const searchParams = useSearchParams();
  const contentId = searchParams.get("contentId");

  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [platform, setPlatform] = useState("");
  const [style, setStyle] = useState(IMAGE_STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState(IMAGE_PRESETS[0].value);
  const [textOverlay, setTextOverlay] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ image: GeneratedImageDTO; configured: boolean; error?: string } | null>(null);

  async function generate() {
    if (!description) {
      toast.error("Image description is required");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiFetch<{ image: GeneratedImageDTO; configured: boolean; error?: string }>("/api/images", {
        method: "POST",
        body: JSON.stringify({ contentId, description, brand, platform, style, aspectRatio, textOverlay }),
      });
      setResult(res);
      if (!res.image.url) {
        toast.error("Image generation is not available yet — see details below.");
      } else {
        toast.success("Image generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Generate an image</CardTitle>
          </CardHeader>
          <CardBody>
            {contentId && <p className="mb-3 text-xs text-muted-foreground">Linked to content #{contentId.slice(0, 8)}</p>}
            <FieldGroup>
              <Label htmlFor="idesc">Image description</Label>
              <Textarea id="idesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. A steaming bowl of ramen on a wooden table, soft natural light" />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="ibrand" hint="optional">
                  Brand/business
                </Label>
                <Input id="ibrand" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="iplatform" hint="optional">
                  Platform
                </Label>
                <Input id="iplatform" value={platform} onChange={(e) => setPlatform(e.target.value)} />
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="istyle">Image style</Label>
              <Select id="istyle" value={style} onChange={(e) => setStyle(e.target.value)}>
                {IMAGE_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="iaspect">Aspect ratio</Label>
              <Select id="iaspect" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                {IMAGE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup className="mb-0">
              <Label htmlFor="itext" hint="optional">
                Text to include
              </Label>
              <Input id="itext" value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} placeholder="e.g. 20% OFF this week" />
            </FieldGroup>
          </CardBody>
        </Card>
        <Button className="w-full" size="lg" onClick={generate} loading={generating}>
          <ImageIcon className="size-4" /> Generate Image
        </Button>
      </div>

      <div>
        {generating && <GeneratingIndicator label="Generating your image..." />}

        {!generating && result && (
          <Card>
            <CardBody className="space-y-3">
              {result.image.url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.image.url} alt={result.image.prompt} className="w-full rounded-xl border border-border" />
                  <a href={result.image.url} download={`image-${result.image.id}.png`}>
                    <Button variant="outline" size="sm">
                      <Download className="size-3.5" /> Download image
                    </Button>
                  </a>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                  <p className="font-medium">Image generation isn&apos;t connected yet</p>
                  <p className="mt-1 text-warning/90">{result.error}</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {!generating && !result && (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
            <ImageIcon className="size-8" />
            <p className="max-w-xs text-sm">Describe the image you want and click Generate Image.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImageGeneratorPage() {
  return (
    <Suspense>
      <ImageGeneratorInner />
    </Suspense>
  );
}
