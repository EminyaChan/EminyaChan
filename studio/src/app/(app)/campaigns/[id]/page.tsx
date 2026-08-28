"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2, X, Image as ImageIcon, Video } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, STATUS_LABELS, formatDate } from "@/lib/utils";
import type { CampaignDTO } from "@/lib/types";

const STATUS_OPTIONS = ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"];
const STATUS_LABEL_MAP: Record<string, string> = { PLANNING: "Planning", ACTIVE: "Active", COMPLETED: "Completed", ARCHIVED: "Archived" };

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDTO | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    apiFetch<CampaignDTO>(`/api/campaigns/${id}`)
      .then(setCampaign)
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

  async function removeContent(contentId: string) {
    try {
      await apiFetch(`/api/content/${contentId}`, { method: "PATCH", body: JSON.stringify({ campaignId: null }) });
      setCampaign((c) => (c ? { ...c, contents: c.contents?.filter((x) => x.id !== contentId) } : c));
      toast.success("Removed from campaign");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
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

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/campaigns" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Campaigns
      </Link>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">{campaign.name}</h1>
              {campaign.description && <p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p>}
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
          <div className="flex flex-wrap gap-1.5">
            {campaign.platforms.map((p) => (
              <Badge key={p} tone="primary">
                {PLATFORM_LABELS[p]}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Created {formatDate(campaign.createdAt)}</p>
        </CardBody>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Content in this campaign ({campaign.contents?.length ?? 0})</h2>
          <Link href="/generator" className="text-sm font-medium text-primary hover:underline">
            + Generate new content
          </Link>
        </div>

        {!campaign.contents?.length ? (
          <Card>
            <CardBody className="py-10 text-center text-sm text-muted-foreground">
              No content assigned yet. Open any piece in the Content Library and assign it to this campaign.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {campaign.contents.map((item) => (
              <Card key={item.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/library/${item.id}`} className="font-medium hover:text-primary">
                      {item.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge tone="primary">{PLATFORM_LABELS[item.platform]}</Badge>
                      <Badge>{CONTENT_TYPE_LABELS[item.contentType]}</Badge>
                      <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                      {item.images?.length ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ImageIcon className="size-3" /> image
                        </span>
                      ) : null}
                      {item.videos?.length ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Video className="size-3" /> video
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button onClick={() => removeContent(item.id)} className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger" aria-label="Remove from campaign">
                    <X className="size-4" />
                  </button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
