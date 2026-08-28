"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Megaphone } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORM_LABELS, formatDate } from "@/lib/utils";
import type { CampaignDTO } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = { PLANNING: "Planning", ACTIVE: "Active", COMPLETED: "Completed", ARCHIVED: "Archived" };
const STATUS_TONE: Record<string, "neutral" | "primary" | "success" | "warning"> = {
  PLANNING: "warning",
  ACTIVE: "primary",
  COMPLETED: "success",
  ARCHIVED: "neutral",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: CampaignDTO[] }>("/api/campaigns")
      .then((r) => setCampaigns(r.items))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load campaigns"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A campaign is a full marketing plan: brief → AI strategy → content calendar → copy → visuals → approval → schedule.
        </p>
        <Link href="/campaigns/new">
          <Button size="sm">
            <Plus className="size-3.5" /> New campaign
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
            <Megaphone className="size-8" />
            <p className="text-sm">No campaigns yet. Start with a marketing brief and let AI build the rest.</p>
            <Link href="/campaigns/new" className="text-sm font-medium text-primary hover:underline">
              Create your first campaign →
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{c.name}</p>
                    <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                  </div>
                  {(c.businessName || c.description) && <p className="line-clamp-2 text-sm text-muted-foreground">{c.businessName ? `${c.businessName} — ${c.industry ?? ""}` : c.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {c.platforms.map((p) => (
                      <Badge key={p}>{PLATFORM_LABELS[p]}</Badge>
                    ))}
                    {c.strategy && <Badge tone="success">Strategy ready</Badge>}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                    <span>{c._count?.contents ?? 0} piece{(c._count?.contents ?? 0) === 1 ? "" : "s"} of content</span>
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
