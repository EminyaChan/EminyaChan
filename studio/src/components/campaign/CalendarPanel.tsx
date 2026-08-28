"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, Plus, Files, Trash2, Sparkles } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Field";
import { GeneratingIndicator } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import { STATUS_LABELS } from "@/lib/utils";
import { PLATFORMS, CONTENT_TYPES } from "@/lib/constants";
import type { CampaignDTO, ContentDTO, MarketingStrategyDTO } from "@/lib/types";

const CALENDAR_STATUSES = ["IDEA", "DRAFT", "AI_GENERATED", "EDITING", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "PUBLISHED"];

export function CalendarPanel({ campaign, onChange }: { campaign: CampaignDTO; onChange: (c: CampaignDTO) => void }) {
  const [generating, setGenerating] = useState(false);
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const items = campaign.contents ?? [];
  const strategy = campaign.strategy as MarketingStrategyDTO | null | undefined;
  const pillars = strategy && "contentPillars" in strategy ? strategy.contentPillars : [];

  async function generateCalendar() {
    setGenerating(true);
    setShowGenerateForm(false);
    try {
      const res = await apiFetch<{ items: ContentDTO[]; isFallback: boolean }>(`/api/campaigns/${campaign.id}/calendar`, {
        method: "POST",
        body: JSON.stringify({ postsPerWeek }),
      });
      onChange({ ...campaign, contents: [...(campaign.contents ?? []), ...res.items] });
      toast.success(`${res.items.length} calendar items created`, {
        description: res.isFallback ? "Used the built-in template (no AI provider configured)." : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate calendar");
    } finally {
      setGenerating(false);
    }
  }

  async function updateItem(id: string, patch: Record<string, unknown>) {
    try {
      const updated = await apiFetch<ContentDTO>(`/api/content/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      onChange({ ...campaign, contents: (campaign.contents ?? []).map((c) => (c.id === id ? { ...c, ...updated } : c)) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function duplicateItem(id: string) {
    try {
      const copy = await apiFetch<ContentDTO>(`/api/content/${id}/duplicate`, { method: "POST" });
      onChange({ ...campaign, contents: [...(campaign.contents ?? []), copy] });
      toast.success("Duplicated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Remove this post from the calendar? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/content/${id}`, { method: "DELETE" });
      onChange({ ...campaign, contents: (campaign.contents ?? []).filter((c) => c.id !== id) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (generating) return <GeneratingIndicator label="Building your content calendar..." />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{items.length} planned post{items.length === 1 ? "" : "s"}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddForm((v) => !v)}>
            <Plus className="size-3.5" /> Add post
          </Button>
          <Button size="sm" onClick={() => setShowGenerateForm((v) => !v)}>
            <Sparkles className="size-3.5" /> Generate Calendar
          </Button>
        </div>
      </div>

      {showGenerateForm && (
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Posts per week</label>
              <Input type="number" min={1} max={14} value={postsPerWeek} onChange={(e) => setPostsPerWeek(Number(e.target.value))} className="w-24" />
            </div>
            <p className="max-w-sm text-xs text-muted-foreground">
              Spreads posts across the campaign dates, rotating through platforms and content pillars from your strategy.
            </p>
            <Button size="sm" onClick={generateCalendar}>
              Generate
            </Button>
          </CardBody>
        </Card>
      )}

      {showAddForm && (
        <AddPostForm
          campaign={campaign}
          pillars={pillars}
          onAdded={(item) => {
            onChange({ ...campaign, contents: [...(campaign.contents ?? []), item] });
            setShowAddForm(false);
          }}
        />
      )}

      {items.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
            <CalendarDays className="size-8" />
            <p className="text-sm">No content planned yet. Generate a calendar or add a post manually.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Title</th>
                <th className="px-3 py-2.5 font-medium">Platform</th>
                <th className="px-3 py-2.5 font-medium">Pillar</th>
                <th className="px-3 py-2.5 font-medium">Content type</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      value={item.scheduledDate ? item.scheduledDate.slice(0, 10) : ""}
                      onChange={(e) => updateItem(item.id, { scheduledDate: e.target.value || null })}
                      className="w-[150px] text-xs"
                    />
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2">
                    <Link href={`/library/${item.id}`} className="font-medium hover:text-primary">
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Select value={item.platform} onChange={(e) => updateItem(item.id, { platform: e.target.value })} className="w-[130px] text-xs">
                      {PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={item.contentPillar ?? ""}
                      onChange={(e) => updateItem(item.id, { contentPillar: e.target.value })}
                      className="w-[150px] text-xs"
                    >
                      <option value="">—</option>
                      {Array.from(new Set([...(pillars ?? []), item.contentPillar].filter(Boolean))).map((p) => (
                        <option key={p as string} value={p as string}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select value={item.contentType} onChange={(e) => updateItem(item.id, { contentType: e.target.value })} className="w-[160px] text-xs">
                      {CONTENT_TYPES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select value={item.status} onChange={(e) => updateItem(item.id, { status: e.target.value })} className="w-[150px] text-xs">
                      {CALENDAR_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => duplicateItem(item.id)} className="rounded p-1.5 hover:bg-black/5" aria-label="Duplicate">
                        <Files className="size-3.5" />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="rounded p-1.5 hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddPostForm({
  campaign,
  pillars,
  onAdded,
}: {
  campaign: CampaignDTO;
  pillars: string[];
  onAdded: (item: ContentDTO) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [platform, setPlatform] = useState(campaign.platforms[0] ?? "INSTAGRAM");
  const [pillar, setPillar] = useState(pillars[0] ?? "");
  const [contentType, setContentType] = useState("SOCIAL_POST");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) {
      toast.error("Give the post a topic/title");
      return;
    }
    setSaving(true);
    try {
      const item = await apiFetch<ContentDTO>("/api/content", {
        method: "POST",
        body: JSON.stringify({
          campaignId: campaign.id,
          title,
          platform,
          contentType,
          contentPillar: pillar || null,
          scheduledDate: date || null,
          industry: campaign.industry,
          targetAudience: campaign.targetAudience,
          status: "IDEA",
          body: title,
          hashtags: [],
        }),
      });
      onAdded(item);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Topic/title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's this post about?" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[150px]" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Platform</label>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-[140px]">
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Pillar</label>
          <Input value={pillar} onChange={(e) => setPillar(e.target.value)} className="w-[140px]" placeholder="e.g. Educational" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Content type</label>
          <Select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-[160px]">
            {CONTENT_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <Button size="sm" onClick={submit} loading={saving}>
          Add
        </Button>
      </CardBody>
    </Card>
  );
}
