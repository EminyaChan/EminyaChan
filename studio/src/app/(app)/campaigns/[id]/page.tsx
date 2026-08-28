"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORM_LABELS, OBJECTIVE_LABELS, formatDate, cn } from "@/lib/utils";
import type { CampaignDTO } from "@/lib/types";
import { WorkflowProgress } from "@/components/campaign/WorkflowProgress";
import { StrategyPanel } from "@/components/campaign/StrategyPanel";
import { CalendarPanel } from "@/components/campaign/CalendarPanel";

const STATUS_OPTIONS = ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"];
const STATUS_LABEL_MAP: Record<string, string> = { PLANNING: "Planning", ACTIVE: "Active", COMPLETED: "Completed", ARCHIVED: "Archived" };

const DRAFT_STATUSES = ["IDEA", "DRAFT", "AI_GENERATED", "EDITING", "PENDING_APPROVAL", "GENERATED"];

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"strategy" | "calendar">("calendar");

  function load() {
    apiFetch<CampaignDTO>(`/api/campaigns/${id}`)
      .then((c) => {
        setCampaign(c);
        setTab(c.strategy ? "calendar" : "strategy");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status: string) {
    if (!campaign) return;
    try {
      const updated = await apiFetch<CampaignDTO>(`/api/campaigns/${campaign.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setCampaign({ ...campaign, ...updated });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function deleteCampaign() {
    if (!campaign || !confirm(`Delete "${campaign.name}"? Content stays in your library, just unassigned.`)) return;
    try {
      await apiFetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      toast.success("Campaign deleted");
      router.push("/campaigns");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <Skeleton className="h-64" />;
  if (!campaign) return <p className="text-sm text-muted-foreground">This campaign could not be found.</p>;

  const contents = campaign.contents ?? [];
  const stats = {
    total: contents.length,
    draft: contents.filter((c) => DRAFT_STATUSES.includes(c.status)).length,
    approved: contents.filter((c) => c.status === "APPROVED").length,
    scheduled: contents.filter((c) => c.status === "SCHEDULED").length,
    published: contents.filter((c) => c.status === "PUBLISHED").length,
    images: contents.filter((c) => c.images?.length).length,
    videos: contents.filter((c) => c.videos?.length).length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/campaigns" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Campaigns
      </Link>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">{campaign.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {campaign.businessName || "—"}
                {campaign.industry ? ` · ${campaign.industry}` : ""}
                {campaign.objective ? ` · ${OBJECTIVE_LABELS[campaign.objective]}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={campaign.status} onChange={(e) => updateStatus(e.target.value)} className="w-auto">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL_MAP[s]}
                  </option>
                ))}
              </Select>
              <Button variant="outline" size="sm" onClick={deleteCampaign}>
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </div>
          </div>

          <WorkflowProgress campaign={campaign} />

          <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
            {campaign.platforms.map((p) => (
              <Badge key={p} tone="primary">
                {PLATFORM_LABELS[p]}
              </Badge>
            ))}
            {campaign.startDate && (
              <Badge>
                {formatDate(campaign.startDate)} – {campaign.endDate ? formatDate(campaign.endDate) : "ongoing"}
              </Badge>
            )}
            {campaign.budget && <Badge>Budget: {campaign.budget}</Badge>}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
        <Stat label="Total" value={stats.total} />
        <Stat label="Draft" value={stats.draft} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Scheduled" value={stats.scheduled} />
        <Stat label="Published" value={stats.published} />
        <Stat label="Images" value={stats.images} />
        <Stat label="Videos" value={stats.videos} />
      </div>

      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === "strategy"} onClick={() => setTab("strategy")}>
          Strategy
        </TabButton>
        <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")}>
          Content Calendar
        </TabButton>
      </div>

      {tab === "strategy" ? (
        <StrategyPanel campaign={campaign} onChange={setCampaign} />
      ) : (
        <CalendarPanel campaign={campaign} onChange={setCampaign} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody className="p-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardBody>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border-b-2 px-3 py-2 text-sm font-medium",
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
