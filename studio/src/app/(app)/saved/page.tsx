"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Star, Copy, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, STATUS_LABELS, formatDate } from "@/lib/utils";
import type { ContentDTO } from "@/lib/types";

export default function SavedContentPage() {
  const [items, setItems] = useState<ContentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    apiFetch<{ items: ContentDTO[] }>("/api/content?favorite=true")
      .then((r) => setItems(r.items))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load saved content"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function unsave(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await apiFetch(`/api/content/${id}/favorite`, { method: "POST" });
      toast.success("Removed from saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
      load();
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
      <p className="text-sm text-muted-foreground">Content you&apos;ve starred as a favorite from Content History, kept here for quick access.</p>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <Star className="size-8" />
          <p className="text-sm">Nothing saved yet. Tap the star on any piece of content to keep it here.</p>
          <Link href="/library" className="text-sm font-medium text-primary hover:underline">
            Browse Content History →
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
                  <button onClick={() => unsave(item.id)} aria-label="Remove from saved">
                    <Star className="size-4 fill-warning text-warning" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="primary">{PLATFORM_LABELS[item.platform]}</Badge>
                  <Badge>{CONTENT_TYPE_LABELS[item.contentType]}</Badge>
                  <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                </div>
                <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{item.body}</p>
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{item.industry || "—"} · {formatDate(item.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyContent(item)} className="rounded p-1.5 hover:bg-black/5" aria-label="Copy">
                      <Copy className="size-3.5" />
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
