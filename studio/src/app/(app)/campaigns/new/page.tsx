"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/Field";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORMS } from "@/lib/constants";
import { OBJECTIVE_LABELS } from "@/lib/utils";
import type { CampaignDTO } from "@/lib/types";

const emptyForm = {
  name: "",
  businessName: "",
  industry: "",
  product: "",
  location: "",
  targetAudience: "",
  objective: "",
  budget: "",
  promotion: "",
  startDate: "",
  endDate: "",
  sellingPoints: "",
  competitors: "",
  brandTone: "",
  brandColors: "",
  brandGuidelines: "",
  websiteUrl: "",
  additionalNotes: "",
  platforms: [] as string[],
};

function toList(s: string) {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function togglePlatform(p: string) {
    setForm((f) => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] }));
  }

  async function submit() {
    if (!form.name) {
      toast.error("Campaign name is required");
      return;
    }
    setSaving(true);
    try {
      const campaign = await apiFetch<CampaignDTO>("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          objective: form.objective || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          sellingPoints: toList(form.sellingPoints),
          competitors: toList(form.competitors),
          brandColors: toList(form.brandColors),
        }),
      });
      toast.success("Marketing plan created");
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/campaigns" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Campaigns
      </Link>

      <div>
        <h1 className="text-lg font-semibold">New Marketing Plan</h1>
        <p className="text-sm text-muted-foreground">
          This brief is the foundation everything else builds on — AI strategy, content calendar, and copy will all use it automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign basics</CardTitle>
        </CardHeader>
        <CardBody>
          <FieldGroup>
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. September Restaurant Promotion" />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Restaurant" />
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="product">Product/service</Label>
              <Input id="product" value={form.product} onChange={(e) => set("product", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </FieldGroup>
          </div>
          <FieldGroup className="mb-0">
            <Label htmlFor="targetAudience">Target audience</Label>
            <Input id="targetAudience" value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Who is this campaign for?" />
          </FieldGroup>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objective, budget & timing</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="objective">Campaign objective</Label>
              <Select id="objective" value={form.objective} onChange={(e) => set("objective", e.target.value)}>
                <option value="">— Select —</option>
                {Object.entries(OBJECTIVE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="budget" hint="optional">
                Budget
              </Label>
              <Input id="budget" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. $2,000" />
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label htmlFor="promotion" hint="optional">
              Promotion/offer
            </Label>
            <Input id="promotion" value={form.promotion} onChange={(e) => set("promotion", e.target.value)} />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="startDate">Campaign start date</Label>
              <Input id="startDate" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="endDate">Campaign end date</Label>
              <Input id="endDate" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </FieldGroup>
          </div>
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
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Positioning</CardTitle>
        </CardHeader>
        <CardBody>
          <FieldGroup>
            <Label htmlFor="sellingPoints" hint="comma-separated">
              Main selling points
            </Label>
            <Textarea id="sellingPoints" value={form.sellingPoints} onChange={(e) => set("sellingPoints", e.target.value)} />
          </FieldGroup>
          <FieldGroup className="mb-0">
            <Label htmlFor="competitors" hint="comma-separated, optional">
              Competitors
            </Label>
            <Input id="competitors" value={form.competitors} onChange={(e) => set("competitors", e.target.value)} />
          </FieldGroup>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="brandTone">Brand tone</Label>
              <Input id="brandTone" value={form.brandTone} onChange={(e) => set("brandTone", e.target.value)} placeholder="e.g. Friendly, Malaysian, casual" />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="brandColors" hint="comma-separated, optional">
                Brand colors
              </Label>
              <Input id="brandColors" value={form.brandColors} onChange={(e) => set("brandColors", e.target.value)} placeholder="e.g. #E85D2C, navy" />
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label htmlFor="brandGuidelines" hint="optional">
              Brand guidelines
            </Label>
            <Textarea id="brandGuidelines" value={form.brandGuidelines} onChange={(e) => set("brandGuidelines", e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="websiteUrl" hint="optional">
              Website/social media links
            </Label>
            <Input id="websiteUrl" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} />
          </FieldGroup>
          <FieldGroup className="mb-0">
            <Label htmlFor="additionalNotes" hint="optional">
              Additional notes
            </Label>
            <Textarea id="additionalNotes" value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} />
          </FieldGroup>
        </CardBody>
      </Card>

      <Button size="lg" className="w-full" onClick={submit} loading={saving}>
        <Sparkles className="size-4" /> Create Marketing Plan
      </Button>
    </div>
  );
}
