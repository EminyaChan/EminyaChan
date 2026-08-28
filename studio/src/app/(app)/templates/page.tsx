"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Trash2, LayoutTemplate } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/Field";
import { apiFetch } from "@/lib/apiClient";
import { CONTENT_TYPES, PLATFORMS, TONES } from "@/lib/constants";

interface IndustryDTO {
  id: string;
  key: string;
  name: string;
  description: string | null;
  defaultTone: string | null;
  defaultAudience: string | null;
  contentAngles: string[];
  hooks: string[];
  ctaStyles: string[];
  objectives: string[];
}

interface TemplateDTO {
  id: string;
  name: string;
  description: string | null;
  platform: string | null;
  contentType: string | null;
  tone: string | null;
  promptHints: string | null;
  isSystem: boolean;
  industry: IndustryDTO | null;
}

const emptyForm = { name: "", description: "", industryId: "", platform: "", contentType: "", tone: "", promptHints: "" };

export default function TemplatesPage() {
  const [industries, setIndustries] = useState<IndustryDTO[]>([]);
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);

  function load() {
    Promise.all([apiFetch<{ items: IndustryDTO[] }>("/api/industries"), apiFetch<{ items: TemplateDTO[] }>("/api/templates")])
      .then(([i, t]) => {
        setIndustries(i.items);
        setTemplates(t.items);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function saveTemplate() {
    if (!form.name) {
      toast.error("Template name is required");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/templates", { method: "POST", body: JSON.stringify({ ...form, industryId: form.industryId || null }) });
      toast.success("Template created");
      setForm(emptyForm);
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await apiFetch(`/api/templates/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const shownIndustries = activeIndustry ? industries.filter((i) => i.key === activeIndustry) : industries;
  const customTemplates = templates.filter((t) => !t.isSystem);

  if (loading) return <p className="text-sm text-muted-foreground">Loading templates…</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Industry:</span>
          <button
            onClick={() => setActiveIndustry(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${activeIndustry === null ? "bg-primary text-primary-foreground" : "bg-black/5 text-muted-foreground"}`}
          >
            All
          </button>
          {industries.map((i) => (
            <button
              key={i.key}
              onClick={() => setActiveIndustry(i.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${activeIndustry === i.key ? "bg-primary text-primary-foreground" : "bg-black/5 text-muted-foreground"}`}
            >
              {i.name}
            </button>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shownIndustries.map((i) => (
          <Card key={i.id}>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{i.name}</p>
                <Link href={`/generator?industry=${i.key}`} className="text-xs font-medium text-primary hover:underline">
                  Use
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">{i.description}</p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge tone="primary">{i.defaultTone}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Audience:</span> {i.defaultAudience}
              </p>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Content angles</p>
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {i.contentAngles.slice(0, 3).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sample hook</p>
                <p className="text-xs italic text-muted-foreground">&quot;{i.hooks[0]}&quot;</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your custom templates</h2>
          <Button size="sm" onClick={() => setCreating((v) => !v)}>
            <Plus className="size-3.5" /> New template
          </Button>
        </div>

        {creating && (
          <Card className="mb-3">
            <CardHeader>
              <CardTitle>New custom template</CardTitle>
            </CardHeader>
            <CardBody>
              <FieldGroup>
                <Label htmlFor="tname">Name</Label>
                <Input id="tname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="tdesc">Description</Label>
                <Textarea id="tdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup>
                  <Label htmlFor="tindustry">Industry</Label>
                  <Select id="tindustry" value={form.industryId} onChange={(e) => setForm({ ...form, industryId: e.target.value })}>
                    <option value="">— None —</option>
                    {industries.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="ttone">Tone</Label>
                  <Select id="ttone" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                    <option value="">— None —</option>
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup>
                  <Label htmlFor="tplatform">Platform</Label>
                  <Select id="tplatform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                    <option value="">— None —</option>
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="tcontenttype">Content type</Label>
                  <Select id="tcontenttype" value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value })}>
                    <option value="">— None —</option>
                    {CONTENT_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
              </div>
              <FieldGroup className="mb-0">
                <Label htmlFor="thints">Prompt hints</Label>
                <Textarea id="thints" value={form.promptHints} onChange={(e) => setForm({ ...form, promptHints: e.target.value })} placeholder="Extra instructions merged into the generation prompt" />
              </FieldGroup>
              <div className="mt-4 flex gap-2">
                <Button onClick={saveTemplate} loading={saving}>
                  Save template
                </Button>
                <Button variant="outline" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {customTemplates.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <LayoutTemplate className="size-7" />
              <p className="text-sm">No custom templates yet.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {customTemplates.map((t) => (
              <Card key={t.id}>
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{t.name}</p>
                    <button onClick={() => remove(t.id)} className="rounded p-1 hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {t.platform && <Badge>{t.platform}</Badge>}
                    {t.contentType && <Badge>{t.contentType}</Badge>}
                    {t.tone && <Badge tone="primary">{t.tone}</Badge>}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
