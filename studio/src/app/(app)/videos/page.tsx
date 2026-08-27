"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Video, Play, Copy } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Label, FieldGroup } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { GeneratingIndicator } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import { LANGUAGES, PLATFORMS, VIDEO_DURATIONS } from "@/lib/constants";
import type { GeneratedVideoDTO } from "@/lib/types";

function VideoGeneratorInner() {
  const searchParams = useSearchParams();
  const contentId = searchParams.get("contentId");

  const [product, setProduct] = useState("");
  const [objective, setObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [platform, setPlatform] = useState("TIKTOK");
  const [duration, setDuration] = useState("30s");
  const [style, setStyle] = useState("");
  const [language, setLanguage] = useState("English");

  const [generating, setGenerating] = useState(false);
  const [video, setVideo] = useState<GeneratedVideoDTO | null>(null);
  const [rendering, setRendering] = useState(false);

  async function generate() {
    if (!product || !objective) {
      toast.error("Product/service and video objective are required");
      return;
    }
    setGenerating(true);
    setVideo(null);
    try {
      const res = await apiFetch<{ video: GeneratedVideoDTO; isFallback: boolean; fallbackReason?: string }>("/api/videos", {
        method: "POST",
        body: JSON.stringify({ contentId, product, objective, targetAudience, platform, duration, style, language }),
      });
      setVideo(res.video);
      toast.success("Video plan generated", { description: res.isFallback ? "Used the built-in template (no AI provider configured)." : undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function attemptRender() {
    if (!video) return;
    setRendering(true);
    try {
      const res = await apiFetch<{ video: GeneratedVideoDTO; configured: boolean; error?: string }>(`/api/videos/${video.id}/render`, { method: "POST" });
      setVideo(res.video);
      if (!res.configured) {
        toast.error("Video rendering isn't connected yet", { description: res.error });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Render failed");
    } finally {
      setRendering(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Video plan</CardTitle>
          </CardHeader>
          <CardBody>
            {contentId && <p className="mb-3 text-xs text-muted-foreground">Linked to content #{contentId.slice(0, 8)}</p>}
            <FieldGroup>
              <Label htmlFor="vproduct">Product/service</Label>
              <Input id="vproduct" value={product} onChange={(e) => setProduct(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="vobjective">Video objective</Label>
              <Input id="vobjective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g. Drive product awareness" />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="vaudience" hint="optional">
                Target audience
              </Label>
              <Input id="vaudience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="vplatform">Platform</Label>
                <Select id="vplatform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="vduration">Duration</Label>
                <Select id="vduration" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  {VIDEO_DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="vstyle" hint="optional">
                  Style
                </Label>
                <Input id="vstyle" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g. UGC, cinematic" />
              </FieldGroup>
              <FieldGroup className="mb-0">
                <Label htmlFor="vlanguage">Language</Label>
                <Select id="vlanguage" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
            </div>
          </CardBody>
        </Card>
        <Button className="w-full" size="lg" onClick={generate} loading={generating}>
          <Video className="size-4" /> Generate Video Plan
        </Button>
      </div>

      <div>
        {generating && <GeneratingIndicator label="Writing your video script..." />}

        {!generating && video && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>{video.title}</CardTitle>
                <Badge tone={video.status === "COMPLETED" ? "success" : video.status === "FAILED" ? "warning" : "neutral"}>
                  {video.status === "COMPLETED" ? "Rendered" : video.status === "FAILED" ? "Not rendered" : "Plan ready"}
                </Badge>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Hook</p>
                  <p className="text-sm">{video.plan.hook}</p>
                </div>
                {video.plan.scenes.map((s, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 text-sm">
                    <p className="mb-1 text-xs font-semibold text-primary">Scene {i + 1}</p>
                    <p>
                      <span className="font-medium">Visual:</span> {s.visual}
                    </p>
                    <p>
                      <span className="font-medium">Dialogue/Voiceover:</span> {s.dialogue}
                    </p>
                    <p>
                      <span className="font-medium">On-screen text:</span> {s.onScreenText}
                    </p>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">CTA</p>
                  <p className="text-sm">{video.plan.cta}</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-3">
                <Row label="Caption" value={video.caption ?? ""} onCopy={() => copy(video.caption ?? "", "Caption")} />
                <Row label="Hashtags" value={video.hashtags.map((h) => `#${h}`).join(" ")} onCopy={() => copy(video.hashtags.map((h) => `#${h}`).join(" "), "Hashtags")} />
                <Row label="Thumbnail prompt" value={video.thumbnailPrompt ?? ""} onCopy={() => copy(video.thumbnailPrompt ?? "", "Thumbnail prompt")} />
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Render actual video</p>
                  <Button size="sm" onClick={attemptRender} loading={rendering}>
                    <Play className="size-3.5" /> Render video
                  </Button>
                </div>
                {video.status === "FAILED" && video.error && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">{video.error}</div>
                )}
                {video.status === "PENDING" && (
                  <p className="text-xs text-muted-foreground">
                    No video-rendering provider is connected yet. The script/plan above is fully generated — rendering the actual
                    video file requires connecting a provider (e.g. Runway, Pika, Google Veo) via <code>AI_VIDEO_PROVIDER</code>.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {!generating && !video && (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
            <Video className="size-8" />
            <p className="max-w-xs text-sm">Fill in the video details and click Generate Video Plan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <button onClick={onCopy} className="text-muted-foreground hover:text-foreground">
          <Copy className="size-3.5" />
        </button>
      </div>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default function VideoGeneratorPage() {
  return (
    <Suspense>
      <VideoGeneratorInner />
    </Suspense>
  );
}
