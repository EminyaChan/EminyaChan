"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw, X, Plus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { GeneratingIndicator } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORM_LABELS } from "@/lib/utils";
import type { CampaignDTO, MarketingStrategyDTO } from "@/lib/types";

export function StrategyPanel({ campaign, onChange }: { campaign: CampaignDTO; onChange: (c: CampaignDTO) => void }) {
  const [generating, setGenerating] = useState(false);
  const [newPillar, setNewPillar] = useState("");
  const strategy = campaign.strategy as MarketingStrategyDTO | null | undefined;
  const hasStrategy = strategy && "audienceProfile" in strategy;

  async function generate() {
    setGenerating(true);
    try {
      const res = await apiFetch<{ strategy: MarketingStrategyDTO; isFallback: boolean; fallbackReason?: string }>(
        `/api/campaigns/${campaign.id}/strategy`,
        { method: "POST" }
      );
      onChange({ ...campaign, strategy: res.strategy });
      toast.success(hasStrategy ? "Strategy regenerated" : "Strategy generated", {
        description: res.isFallback ? "Used the built-in template (no AI provider configured)." : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate strategy");
    } finally {
      setGenerating(false);
    }
  }

  async function updatePillars(pillars: string[]) {
    try {
      const updated = await apiFetch<MarketingStrategyDTO>(`/api/campaigns/${campaign.id}/strategy`, {
        method: "PATCH",
        body: JSON.stringify({ contentPillars: pillars }),
      });
      onChange({ ...campaign, strategy: updated });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pillars");
    }
  }

  function addPillar() {
    if (!newPillar.trim() || !strategy) return;
    updatePillars([...strategy.contentPillars, newPillar.trim()]);
    setNewPillar("");
  }

  function removePillar(p: string) {
    if (!strategy) return;
    updatePillars(strategy.contentPillars.filter((x) => x !== p));
  }

  if (generating) return <GeneratingIndicator label="Analyzing your brief and building a strategy..." />;

  if (!hasStrategy) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <Sparkles className="size-7 text-primary" />
          <p className="text-sm text-muted-foreground">
            AI will analyze your brief and generate a target audience profile, positioning, content pillars, and recommended platforms.
          </p>
          <Button onClick={generate}>
            <Sparkles className="size-4" /> Generate Strategy
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={generate}>
          <RefreshCw className="size-3.5" /> Regenerate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target audience</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <StrategyField label="Demographics" value={strategy.audienceProfile?.demographics} />
          <StrategyField label="Interests" value={strategy.audienceProfile?.interests} />
          <StrategyField label="Pain points" value={strategy.audienceProfile?.painPoints} />
          <StrategyField label="Buying motivations" value={strategy.audienceProfile?.buyingMotivations} />
          <StrategyField label="Content preferences" value={strategy.audienceProfile?.contentPreferences} className="sm:col-span-2" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Positioning</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <StrategyField label="Brand positioning" value={strategy.positioning?.brandPositioning} />
          <StrategyField label="Unique selling proposition" value={strategy.positioning?.usp} />
          <StrategyField label="Key message" value={strategy.positioning?.keyMessage} />
          <StrategyField label="Differentiation" value={strategy.positioning?.differentiation} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content pillars</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {strategy.contentPillars.map((p) => (
              <span key={p} className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
                {p}
                <button onClick={() => removePillar(p)} aria-label={`Remove ${p}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newPillar} onChange={(e) => setNewPillar(e.target.value)} placeholder="Add a content pillar" onKeyDown={(e) => e.key === "Enter" && addPillar()} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={addPillar}>
              <Plus className="size-3.5" /> Add
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended platforms</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {strategy.recommendedPlatforms?.map((p) => (
            <div key={p.platform} className="rounded-lg border border-border p-3">
              <Badge tone="primary">{PLATFORM_LABELS[p.platform] ?? p.platform}</Badge>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.reason}</p>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function StrategyField({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}
