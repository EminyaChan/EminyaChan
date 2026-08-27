"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Star, Copy, Trash2, FilesIcon, RefreshCw } from "lucide-react";
import { Input, Select } from "@/components/ui/Field";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, STATUS_LABELS, formatDate } from "@/lib/utils";
import { PLATFORMS, CONTENT_TYPES } from "@/lib/constants";
import type { ContentDTO } from "@/lib/types";

export default function LibraryPage() {
  const [items, setItems] = useState<ContentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [status, setStatus] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sort, setSort] = useState("recent");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (platform) params.set("platform", platform);
      if (contentType) params.set("contentType", contentType);
      if (status) params.set("status", status);
      if (favoriteOnly) params.set("favorite", "true");
      params.set("sort", sort);
      const res = await apiFetch<{ items: ContentDTO[] }>(`/api/content?${params.toString()}`);
      setItems(res.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  }, [q, platform, contentType, status, favoriteOnly, sort]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleFavorite(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isFavorite: !i.isFavorite } : i)));
    try {
      await apiFetch(`/api/content/${id}/favorite`, { method: "POST" });
    } catch {
      load();
    }
  }

  async function duplicate(id: string) {
    try {
      await apiFetch(`/api/content/${id}/duplicate`, { method: "POST" });
      toast.success("Duplicated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this content? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/content/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function copyContent(item: ContentDTO) {
    const text = [item.title, "", item.body, item.cta ?? "", item.hashtags.map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, content, industry, tags…" className="pl-9" />
          </div>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-auto">
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
          <Select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-auto">
            <option value="">All content types</option>
            {CONTENT_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
            <option value="recent">Newest first</option>
            <option value="updated">Recently updated</option>
            <option value="title">Title (A-Z)</option>
          </Select>
          <button
            onClick={() => setFavoriteOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${favoriteOnly ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}
          >
            <Star className={favoriteOnly ? "size-4 fill-primary" : "size-4"} /> Favorites
          </button>
          <button onClick={load} className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <RefreshCw className="size-4" /> Refresh
          </button>
        </CardBody>
      </Card>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <FilesIcon className="size-8" />
          <p className="text-sm">No content found. Try adjusting your filters, or generate something new.</p>
          <Link href="/generator" className="text-sm font-medium text-primary hover:underline">
            Go to AI Content Generator →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/library/${item.id}`} className="font-medium leading-snug hover:text-primary">
                    {item.title}
                  </Link>
                  <button onClick={() => toggleFavorite(item.id)} aria-label="Toggle favorite">
                    <Star className={item.isFavorite ? "size-4 fill-warning text-warning" : "size-4 text-muted-foreground"} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="primary">{PLATFORM_LABELS[item.platform]}</Badge>
                  <Badge>{CONTENT_TYPE_LABELS[item.contentType]}</Badge>
                  <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                </div>
                <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{item.body}</p>
                {item.images?.[0]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.images[0].url} alt="" className="h-24 w-full rounded-lg border border-border object-cover" />
                )}
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{item.industry || "—"} · {formatDate(item.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyContent(item)} className="rounded p-1.5 hover:bg-black/5" aria-label="Copy">
                      <Copy className="size-3.5" />
                    </button>
                    <button onClick={() => duplicate(item.id)} className="rounded p-1.5 hover:bg-black/5" aria-label="Duplicate">
                      <FilesIcon className="size-3.5" />
                    </button>
                    <button onClick={() => remove(item.id)} className="rounded p-1.5 hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
