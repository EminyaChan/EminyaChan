"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select, Label, FieldGroup } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/apiClient";
import { LANGUAGES } from "@/lib/constants";

interface SettingsResponse {
  settings: { defaultLanguage: string };
  environment: { textProviderConfigured: boolean; imageProviderConfigured: boolean; videoProviderConfigured: boolean };
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [language, setLanguage] = useState("English");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<SettingsResponse>("/api/settings")
      .then((r) => {
        setData(r);
        setLanguage(r.settings.defaultLanguage);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify({ defaultLanguage: language }) });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI provider status</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <ProviderRow label="Text generation" configured={data?.environment.textProviderConfigured ?? false} envVars="OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY" />
          <ProviderRow label="Image generation" configured={data?.environment.imageProviderConfigured ?? false} envVars="OPENAI_API_KEY" />
          <ProviderRow label="Video rendering" configured={data?.environment.videoProviderConfigured ?? false} envVars="AI_VIDEO_PROVIDER (not yet implemented — see lib/ai/providers/video.ts)" />
          <p className="text-xs text-muted-foreground">
            Without a configured provider, text generation automatically falls back to a built-in template so the app keeps
            working end-to-end. Image and video generation clearly report when they aren&apos;t configured rather than
            faking output.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardBody>
          <FieldGroup className="mb-0">
            <Label htmlFor="deflang">Default language</Label>
            <Select id="deflang" value={language} onChange={(e) => setLanguage(e.target.value)} className="max-w-xs">
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <Button className="mt-4" onClick={save} loading={saving}>
            Save settings
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

function ProviderRow({ label, configured, envVars }: { label: string; configured: boolean; envVars: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{envVars}</p>
      </div>
      {configured ? (
        <span className="flex items-center gap-1 text-xs font-medium text-accent">
          <CheckCircle2 className="size-4" /> Configured
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <XCircle className="size-4" /> Not configured
        </span>
      )}
    </div>
  );
}
