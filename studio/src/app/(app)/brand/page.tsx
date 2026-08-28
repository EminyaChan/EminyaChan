"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Star, Trash2, Building2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldGroup } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/apiClient";
import type { BrandDTO } from "@/lib/types";

const emptyForm = {
  name: "",
  description: "",
  industry: "",
  targetAudience: "",
  voice: "",
  preferredLanguages: "",
  preferredPlatforms: "",
  sellingPoints: "",
  forbiddenWords: "",
  preferredCta: "",
  website: "",
};

type FormState = typeof emptyForm;

export default function BrandSettingsPage() {
  const [brands, setBrands] = useState<BrandDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    apiFetch<{ items: BrandDTO[] }>("/api/brand")
      .then((r) => setBrands(r.items))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load brands"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setForm(emptyForm);
    setEditingId("new");
  }

  function startEdit(b: BrandDTO) {
    setForm({
      name: b.name,
      description: b.description ?? "",
      industry: b.industry ?? "",
      targetAudience: b.targetAudience ?? "",
      voice: b.voice ?? "",
      preferredLanguages: b.preferredLanguages.join(", "),
      preferredPlatforms: b.preferredPlatforms.join(", "),
      sellingPoints: b.sellingPoints.join(", "),
      forbiddenWords: b.forbiddenWords.join(", "),
      preferredCta: b.preferredCta ?? "",
      website: b.website ?? "",
    });
    setEditingId(b.id);
  }

  function toList(s: string) {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function save() {
    if (!form.name) {
      toast.error("Brand name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      industry: form.industry,
      targetAudience: form.targetAudience,
      voice: form.voice,
      preferredLanguages: toList(form.preferredLanguages),
      preferredPlatforms: toList(form.preferredPlatforms),
      sellingPoints: toList(form.sellingPoints),
      forbiddenWords: toList(form.forbiddenWords),
      preferredCta: form.preferredCta,
      website: form.website,
    };
    try {
      if (editingId === "new") {
        await apiFetch("/api/brand", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/brand/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      toast.success("Brand profile saved");
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(id: string) {
    try {
      await apiFetch(`/api/brand/${id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this brand profile?")) return;
    try {
      await apiFetch(`/api/brand/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your brand profiles</h2>
          <Button size="sm" onClick={startNew}>
            <Plus className="size-3.5" /> New brand
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : brands.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Building2 className="size-8" />
              <p className="text-sm">No brand profiles yet. Create one so the generator can auto-fill your business details.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {brands.map((b) => (
              <Card key={b.id}>
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{b.name}</p>
                        {b.isDefault && <Badge tone="primary">Default</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{b.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!b.isDefault && (
                        <button onClick={() => makeDefault(b.id)} className="rounded p-1.5 hover:bg-black/5" aria-label="Make default">
                          <Star className="size-4 text-muted-foreground" />
                        </button>
                      )}
                      <button onClick={() => remove(b.id)} className="rounded p-1.5 hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {b.industry && <Badge>{b.industry}</Badge>}
                    {b.preferredPlatforms.map((p) => (
                      <Badge key={p}>{p}</Badge>
                    ))}
                  </div>
                  <button onClick={() => startEdit(b)} className="text-sm font-medium text-primary hover:underline">
                    Edit profile
                  </button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editingId && (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{editingId === "new" ? "New brand profile" : "Edit brand profile"}</CardTitle>
          </CardHeader>
          <CardBody>
            <FieldGroup>
              <Label htmlFor="bname">Brand name</Label>
              <Input id="bname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="bdesc">Brand description</Label>
              <Textarea id="bdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="bindustry">Industry</Label>
                <Input id="bindustry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="baudience">Target audience</Label>
                <Input id="baudience" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="bvoice">Brand voice</Label>
              <Textarea id="bvoice" value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} placeholder="How should the AI sound when writing for this brand?" />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="blang" hint="comma-separated">
                  Preferred languages
                </Label>
                <Input id="blang" value={form.preferredLanguages} onChange={(e) => setForm({ ...form, preferredLanguages: e.target.value })} placeholder="English, Simplified Chinese" />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="bplat" hint="comma-separated">
                  Preferred platforms
                </Label>
                <Input id="bplat" value={form.preferredPlatforms} onChange={(e) => setForm({ ...form, preferredPlatforms: e.target.value })} placeholder="INSTAGRAM, XIAOHONGSHU" />
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="bpoints" hint="comma-separated">
                Key selling points
              </Label>
              <Textarea id="bpoints" value={form.sellingPoints} onChange={(e) => setForm({ ...form, sellingPoints: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="bforbidden" hint="comma-separated">
                Forbidden words
              </Label>
              <Input id="bforbidden" value={form.forbiddenWords} onChange={(e) => setForm({ ...form, forbiddenWords: e.target.value })} placeholder="cheap, discount, guaranteed" />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="bcta">Preferred CTA</Label>
                <Input id="bcta" value={form.preferredCta} onChange={(e) => setForm({ ...form, preferredCta: e.target.value })} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="bwebsite">Website</Label>
                <Input id="bwebsite" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </FieldGroup>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} loading={saving}>
                Save profile
              </Button>
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
