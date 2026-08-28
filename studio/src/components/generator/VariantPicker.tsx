"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { GeneratedVariant, StandardVariant, XhsVariant, HeadlineVariant, VideoScriptVariant } from "@/lib/generation/service";

function isXhs(v: GeneratedVariant): v is XhsVariant {
  return "titles" in v;
}
function isHeadline(v: GeneratedVariant): v is HeadlineVariant {
  return "variations" in v;
}
function isVideo(v: GeneratedVariant): v is VideoScriptVariant {
  return "scenes" in v;
}

export function VariantPicker({
  variants,
  onPick,
  saving,
  provider,
  isFallback,
  fallbackReason,
}: {
  variants: GeneratedVariant[];
  onPick: (index: number) => void;
  saving: number | null;
  provider: string;
  isFallback: boolean;
  fallbackReason?: string;
}) {
  return (
    <div className="space-y-3">
      {isFallback && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          Generated with the built-in template — no AI provider is configured{fallbackReason ? ` (${fallbackReason})` : ""}. Set
          OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY to enable real AI drafting.
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {variants.length} variation{variants.length > 1 ? "s" : ""} generated with <span className="font-medium text-foreground">{provider}</span>. Pick one to save to your library.
      </p>
      <div className="grid gap-3 md:grid-cols-1">
        {variants.map((v, i) => (
          <Card key={i}>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge tone="primary">Variation {i + 1}</Badge>
                <Button size="sm" onClick={() => onPick(i)} loading={saving === i} disabled={saving !== null}>
                  Use this version
                </Button>
              </div>
              {isXhs(v) && (
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{v.titles[0]}</p>
                  <p className="text-muted-foreground line-clamp-4 whitespace-pre-line">{`${v.hook}\n${v.body}`}</p>
                </div>
              )}
              {isHeadline(v) && (
                <ul className="space-y-1.5 text-sm">
                  {v.variations.map((line, j) => (
                    <li key={j} className="rounded-lg border border-border px-3 py-2">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              {isVideo(v) && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{v.title}</p>
                  <p className="text-muted-foreground">{v.hook}</p>
                  <p className="text-xs text-muted-foreground">{v.scenes.length} scenes · CTA: {v.cta}</p>
                </div>
              )}
              {!isXhs(v) && !isHeadline(v) && !isVideo(v) && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{(v as StandardVariant).title}</p>
                  <p className="text-muted-foreground line-clamp-4 whitespace-pre-line">{(v as StandardVariant).body}</p>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
