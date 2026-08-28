"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Megaphone } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/Field";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORM_LABELS, formatDate } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import type { CampaignDTO } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = { PLANNING: "Planning", ACTIVE: "Active", COMPLETED: "Completed", ARCHIVED: "Archived" };
const STATUS_TONE: Record<string, "neutral" | "primary" | "success" | "warning"> = {
  PLANNING: "warning",
  ACTIVE: "primary",
  COMPLETED: "success",
  ARCHIVED: "neutral",
};

const emptyForm = { name: "", description: "", status: "PLANNING", platforms: [] as string[] };

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    apiFetch<{ items: CampaignDTO[] }>("/api/campaigns")
      .then((r) => setCampaigns(r.items))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load campaigns"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function togglePlatform(p: string) {
    setForm((f) => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] }));
  }

  async function save() {
    if (!form.name) {
      toast.error("Campaign name is required");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/campaigns", { method: "POST", body: JSON.stringify(form) });
      toast.success("Campaign created");
      setForm(emptyForm);
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Group content, images, and video scripts under one campaign to plan and track a push together.</p>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="size-3.5" /> New campaign
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New campaign</CardTitle>
          </CardHeader>
          <CardBody>
            <FieldGroup>
              <Label htmlFor="cname">Campaign name</Label>
              <Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. September Restaurant Promotion" />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="cdesc" hint="optional">
                Description
              </Label>
              <Textarea id="cdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="cstatus">Status</Label>
              <Select id="cstatus" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="max-w-xs">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup className="mb-0">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      form.platforms.includes(p.value) ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </FieldGroup>
            <div className="mt-4 flex gap-2">
              <Button onClick={save} loading={saving}>
                Create campaign
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
            <Megaphone className="size-8" />
            <p className="text-sm">No campaigns yet. Group related content together to plan a launch or promotion.</p>
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
                  {c.description && <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {c.platforms.map((p) => (
                      <Badge key={p}>{PLATFORM_LABELS[p]}</Badge>
                    ))}
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
