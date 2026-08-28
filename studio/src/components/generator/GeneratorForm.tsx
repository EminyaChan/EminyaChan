"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/Field";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { CONTENT_TYPES, LANGUAGES, LENGTHS, PLATFORMS, TONES, VARIATIONS } from "@/lib/constants";
import type { BrandDTO } from "@/lib/types";
import { Sparkles } from "lucide-react";

export interface GeneratorFormValues {
  businessName: string;
  industry: string;
  product: string;
  productDescription: string;
  targetAudience: string;
  location: string;
  sellingPoints: string;
  promotion: string;
  websiteUrl: string;
  platform: string;
  contentType: string;
  tone: string;
  language: string;
  length: "short" | "medium" | "long";
  variations: 1 | 3 | 5;
  objective: string;
  specialInstructions: string;
  brandId: string;
}

export const EMPTY_FORM: GeneratorFormValues = {
  businessName: "",
  industry: "",
  product: "",
  productDescription: "",
  targetAudience: "",
  location: "",
  sellingPoints: "",
  promotion: "",
  websiteUrl: "",
  platform: "XIAOHONGSHU",
  contentType: "SOCIAL_POST",
  tone: "Friendly",
  language: "English",
  length: "medium",
  variations: 3,
  objective: "",
  specialInstructions: "",
  brandId: "",
};

export function GeneratorForm({
  values,
  onChange,
  onSubmit,
  loading,
}: {
  values: GeneratorFormValues;
  onChange: (v: GeneratorFormValues) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const [brands, setBrands] = useState<BrandDTO[]>([]);

  useEffect(() => {
    fetch("/api/brand")
      .then((r) => r.json())
      .then((d) => setBrands(d.items ?? []))
      .catch(() => {});
  }, []);

  function set<K extends keyof GeneratorFormValues>(key: K, value: GeneratorFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function applyBrand(brandId: string) {
    const brand = brands.find((b) => b.id === brandId);
    if (!brand) {
      set("brandId", "");
      return;
    }
    onChange({
      ...values,
      brandId,
      businessName: brand.name,
      industry: brand.industry || values.industry,
      targetAudience: brand.targetAudience || values.targetAudience,
      sellingPoints: brand.sellingPoints.join(", ") || values.sellingPoints,
      websiteUrl: brand.website || values.websiteUrl,
      tone: (TONES.find((t) => t === brand.voice) as string) || values.tone,
    });
  }

  return (
    <div className="space-y-4">
      {brands.length > 0 && (
        <Card>
          <CardBody className="flex items-center gap-3">
            <Label htmlFor="brand" hint="optional">
              Use brand profile
            </Label>
            <Select id="brand" value={values.brandId} onChange={(e) => applyBrand(e.target.value)} className="max-w-xs">
              <option value="">— None —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Business information</CardTitle>
        </CardHeader>
        <CardBody>
          <FieldGroup>
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" value={values.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="e.g. Riverbend Kitchen" />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={values.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Restaurant" />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="product">Product/service</Label>
              <Input id="product" value={values.product} onChange={(e) => set("product", e.target.value)} placeholder="e.g. Fall tasting menu" />
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label htmlFor="productDescription">Product description</Label>
            <Textarea id="productDescription" value={values.productDescription} onChange={(e) => set("productDescription", e.target.value)} placeholder="What is it, what makes it worth talking about?" />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="targetAudience">Target audience</Label>
              <Input id="targetAudience" value={values.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Who is this for?" />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Austin, TX" />
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label htmlFor="sellingPoints">Main selling points</Label>
            <Textarea id="sellingPoints" value={values.sellingPoints} onChange={(e) => set("sellingPoints", e.target.value)} placeholder="Comma-separated, e.g. locally-sourced, family-owned, full bar" />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="promotion">Promotion/offer</Label>
              <Input id="promotion" value={values.promotion} onChange={(e) => set("promotion", e.target.value)} placeholder="Optional" />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="websiteUrl">Website/social URL</Label>
              <Input id="websiteUrl" value={values.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="Optional" />
            </FieldGroup>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content settings</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="platform">Platform</Label>
              <Select id="platform" value={values.platform} onChange={(e) => set("platform", e.target.value)}>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="contentType">Content type</Label>
              <Select id="contentType" value={values.contentType} onChange={(e) => set("contentType", e.target.value)}>
                {CONTENT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="tone">Tone</Label>
              <Select id="tone" value={values.tone} onChange={(e) => set("tone", e.target.value)}>
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="language">Language</Label>
              <Select id="language" value={values.language} onChange={(e) => set("language", e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label htmlFor="length">Content length</Label>
              <Select id="length" value={values.length} onChange={(e) => set("length", e.target.value as GeneratorFormValues["length"])}>
                {LENGTHS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="variations">Number of variations</Label>
              <Select id="variations" value={values.variations} onChange={(e) => set("variations", Number(e.target.value) as GeneratorFormValues["variations"])}>
                {VARIATIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label htmlFor="objective" hint="optional">
              Marketing objective
            </Label>
            <Input id="objective" value={values.objective} onChange={(e) => set("objective", e.target.value)} placeholder="e.g. Drive foot traffic" />
          </FieldGroup>
          <FieldGroup className="mb-0">
            <Label htmlFor="specialInstructions" hint="optional">
              Special instructions
            </Label>
            <Textarea id="specialInstructions" value={values.specialInstructions} onChange={(e) => set("specialInstructions", e.target.value)} placeholder="Anything else the AI should know" />
          </FieldGroup>
        </CardBody>
      </Card>

      <Button className="w-full" size="lg" onClick={onSubmit} loading={loading} disabled={!values.businessName || !values.industry || !values.product}>
        <Sparkles className="size-4" /> Generate Content
      </Button>
    </div>
  );
}
