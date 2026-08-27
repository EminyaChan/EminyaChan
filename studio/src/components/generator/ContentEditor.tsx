"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, Star, FileJson, FileText, Image as ImageIcon, Video, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Select, Textarea } from "@/components/ui/Field";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, STATUS_LABELS, formatDateTime } from "@/lib/utils";
import type { ContentDTO } from "@/lib/types";
import Link from "next/link";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fullPostText(content: ContentDTO): string {
  const parts = [content.title, "", content.body];
  if (content.cta) parts.push("", content.cta);
  if (content.hashtags.length) parts.push("", content.hashtags.map((h) => `#${h}`).join(" "));
  return parts.join("\n");
}

export function ContentEditor({
  content,
  onChange,
  showLibraryLink = false,
}: {
  content: ContentDTO;
  onChange: (updated: ContentDTO) => void;
  showLibraryLink?: boolean;
}) {
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);

  async function regenerate(section: string) {
    setRegenerating(section);
    try {
      const res = await apiFetch<{ content: ContentDTO; isFallback: boolean; fallbackReason?: string }>(
        `/api/content/${content.id}/regenerate`,
        { method: "POST", body: JSON.stringify({ section }) }
      );
      onChange(res.content);
      toast.success(section === "full" ? "Content regenerated" : `${section} regenerated`, {
        description: res.isFallback ? "Used the built-in template (no AI provider configured)." : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(null);
    }
  }

  async function updateField(field: "status" | "isFavorite", value: string | boolean) {
    setSavingField(true);
    try {
      const updated = await apiFetch<ContentDTO>(`/api/content/${content.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      onChange({ ...content, ...updated });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingField(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  const isXhs = content.platform === "XIAOHONGSHU" && content.sections;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{PLATFORM_LABELS[content.platform]}</Badge>
            <Badge>{CONTENT_TYPE_LABELS[content.contentType]}</Badge>
            <Badge tone={statusTone(content.status)}>{STATUS_LABELS[content.status]}</Badge>
            <span className="text-xs text-muted-foreground">v{content.currentVersionNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={content.status}
              disabled={savingField}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-auto text-xs"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <button
              onClick={() => updateField("isFavorite", !content.isFavorite)}
              className="rounded-lg p-2 hover:bg-black/5"
              aria-label="Toggle favorite"
            >
              <Star className={content.isFavorite ? "size-4 fill-warning text-warning" : "size-4 text-muted-foreground"} />
            </button>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          {isXhs ? (
            <XhsBody content={content} onRegenerate={regenerate} regenerating={regenerating} onCopy={copy} />
          ) : (
            <StandardBody content={content} onRegenerate={regenerate} regenerating={regenerating} onCopy={copy} />
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => copy(fullPostText(content), "Full post")}>
          <Copy className="size-3.5" /> Copy full post
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadFile(`${content.id}.txt`, fullPostText(content), "text/plain")}>
          <FileText className="size-3.5" /> Export TXT
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadFile(`${content.id}.json`, JSON.stringify(content, null, 2), "application/json")}>
          <FileJson className="size-3.5" /> Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => regenerate("full")} loading={regenerating === "full"}>
          <RefreshCw className="size-3.5" /> Regenerate all
        </Button>
        <Link href={`/images?contentId=${content.id}`}>
          <Button variant="secondary" size="sm">
            <ImageIcon className="size-3.5" /> Generate image
          </Button>
        </Link>
        <Link href={`/videos?contentId=${content.id}`}>
          <Button variant="secondary" size="sm">
            <Video className="size-3.5" /> Generate video
          </Button>
        </Link>
        {showLibraryLink && (
          <Link href={`/library/${content.id}`} className="ml-auto text-sm font-medium text-primary hover:underline">
            Open full details →
          </Link>
        )}
      </div>

      {(content.images?.length || content.videos?.length) ? <MediaStrip content={content} /> : null}

      {content.versions && content.versions.length > 1 && <VersionHistory content={content} onChange={onChange} />}
    </div>
  );
}

function StandardBody({
  content,
  onRegenerate,
  regenerating,
  onCopy,
}: {
  content: ContentDTO;
  onRegenerate: (s: string) => void;
  regenerating: string | null;
  onCopy: (t: string, l: string) => void;
}) {
  return (
    <>
      <SectionBlock
        label="Title"
        value={content.title}
        onRegenerate={() => onRegenerate("title")}
        loading={regenerating === "title"}
        onCopy={() => onCopy(content.title, "Title")}
      />
      <SectionBlock
        label="Body"
        value={content.body}
        multiline
        onRegenerate={() => onRegenerate("content")}
        loading={regenerating === "content"}
        onCopy={() => onCopy(content.body, "Body")}
      />
      <SectionBlock
        label="Call to action"
        value={content.cta ?? ""}
        onRegenerate={() => onRegenerate("cta")}
        loading={regenerating === "cta"}
        onCopy={() => onCopy(content.cta ?? "", "CTA")}
      />
      <SectionBlock
        label="Hashtags"
        value={content.hashtags.map((h) => `#${h}`).join(" ")}
        onRegenerate={() => onRegenerate("hashtags")}
        loading={regenerating === "hashtags"}
        onCopy={() => onCopy(content.hashtags.map((h) => `#${h}`).join(" "), "Hashtags")}
      />
    </>
  );
}

function XhsBody({
  content,
  onRegenerate,
  regenerating,
  onCopy,
}: {
  content: ContentDTO;
  onRegenerate: (s: string) => void;
  regenerating: string | null;
  onCopy: (t: string, l: string) => void;
}) {
  const s = content.sections!;
  return (
    <>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Title options</span>
          <RegenButton onClick={() => onRegenerate("titles")} loading={regenerating === "titles"} />
        </div>
        <div className="space-y-1.5">
          {s.titles?.map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>{t}</span>
              <button onClick={() => onCopy(t, "Title")} className="text-muted-foreground hover:text-foreground">
                <Copy className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <SectionBlock label="Opening hook" value={s.hook} onRegenerate={() => onRegenerate("hook")} loading={regenerating === "hook"} onCopy={() => onCopy(s.hook, "Hook")} />
      <SectionBlock label="Main content" value={s.body} multiline onRegenerate={() => onRegenerate("content")} loading={regenerating === "content"} onCopy={() => onCopy(s.body, "Content")} />
      {s.introduction && <SectionBlock label="Product/business introduction" value={s.introduction} readOnly onCopy={() => onCopy(s.introduction, "Introduction")} />}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Key benefits</span>
          <RegenButton onClick={() => onRegenerate("benefits")} loading={regenerating === "benefits"} />
        </div>
        <ul className="space-y-1 text-sm">
          {s.benefits?.map((b, i) => (
            <li key={i} className="rounded-lg border border-border px-3 py-2">
              {b}
            </li>
          ))}
        </ul>
      </div>
      <SectionBlock label="CTA" value={s.cta} onRegenerate={() => onRegenerate("cta")} loading={regenerating === "cta"} onCopy={() => onCopy(s.cta, "CTA")} />
      <SectionBlock
        label="Hashtags"
        value={(s.hashtags ?? []).map((h) => `#${h}`).join(" ")}
        onRegenerate={() => onRegenerate("hashtags")}
        loading={regenerating === "hashtags"}
        onCopy={() => onCopy((s.hashtags ?? []).map((h) => `#${h}`).join(" "), "Hashtags")}
      />
    </>
  );
}

function RegenButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50">
      <RefreshCw className={loading ? "size-3 animate-spin" : "size-3"} />
      Regenerate
    </button>
  );
}

function SectionBlock({
  label,
  value,
  multiline,
  readOnly,
  onRegenerate,
  loading,
  onCopy,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  readOnly?: boolean;
  onRegenerate?: () => void;
  loading?: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-3">
          {onRegenerate && !readOnly && <RegenButton onClick={onRegenerate} loading={!!loading} />}
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground" aria-label={`Copy ${label}`}>
            <Copy className="size-3.5" />
          </button>
        </div>
      </div>
      {multiline ? (
        <Textarea readOnly value={value} className="min-h-28 cursor-text" />
      ) : (
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
      )}
    </div>
  );
}

function MediaStrip({ content }: { content: ContentDTO }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {content.images?.map((img) => (
        <Card key={img.id}>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ImageIcon className="size-3.5" /> Generated image
            </div>
            {img.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt={img.prompt} className="w-full rounded-lg border border-border object-cover" />
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background px-3 py-4 text-xs text-danger">{img.error || "Generation failed"}</div>
            )}
          </CardBody>
        </Card>
      ))}
      {content.videos?.map((v) => (
        <Card key={v.id}>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Video className="size-3.5" /> Video plan — {v.status === "COMPLETED" ? "rendered" : v.status === "FAILED" ? "not rendered" : "plan ready"}
            </div>
            <p className="text-sm font-medium">{v.title}</p>
            {v.status === "FAILED" && v.error && <p className="text-xs text-warning">{v.error}</p>}
            <Link href={`/videos?contentId=${content.id}`} className="text-xs font-medium text-primary hover:underline">
              View plan →
            </Link>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function VersionHistory({ content, onChange }: { content: ContentDTO; onChange: (c: ContentDTO) => void }) {
  const [restoring, setRestoring] = useState<string | null>(null);
  async function restore(versionId: string) {
    setRestoring(versionId);
    try {
      const updated = await apiFetch<ContentDTO>(`/api/content/${content.id}/versions/${versionId}/restore`, { method: "POST" });
      onChange(updated);
      toast.success("Version restored");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <HistoryIcon className="size-4" /> Version history
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        {content.versions!.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <div>
              <span className="font-medium">v{v.versionNumber}</span>
              <span className="ml-2 text-muted-foreground">{v.changeNote}</span>
              <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(v.createdAt)}</span>
            </div>
            {v.versionNumber !== content.currentVersionNumber && (
              <Button variant="ghost" size="sm" loading={restoring === v.id} onClick={() => restore(v.id)}>
                Restore
              </Button>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
