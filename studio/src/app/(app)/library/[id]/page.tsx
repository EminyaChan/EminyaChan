"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Files } from "lucide-react";
import { ContentEditor } from "@/components/generator/ContentEditor";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/apiClient";
import type { ContentDTO } from "@/lib/types";
import { PLATFORM_LABELS, formatDateTime } from "@/lib/utils";

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [content, setContent] = useState<ContentDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ContentDTO>(`/api/content/${id}`)
      .then(setContent)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  async function duplicate() {
    if (!content) return;
    try {
      const copy = await apiFetch<ContentDTO>(`/api/content/${content.id}/duplicate`, { method: "POST" });
      toast.success("Duplicated");
      router.push(`/library/${copy.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  async function remove() {
    if (!content || !confirm("Delete this content? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/content/${content.id}`, { method: "DELETE" });
      toast.success("Deleted");
      router.push("/library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/library" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Content Library
        </Link>
        {content && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={duplicate}>
              <Files className="size-3.5" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={remove}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      {loading && <Skeleton className="h-96" />}

      {!loading && !content && <p className="text-sm text-muted-foreground">This content could not be found.</p>}

      {content && (
        <>
          <div className="text-xs text-muted-foreground">
            {content.brand?.name && <>Brand: {content.brand.name} · </>}
            {PLATFORM_LABELS[content.platform]} · Created {formatDateTime(content.createdAt)} · Updated {formatDateTime(content.updatedAt)}
            {content.targetAudience && <> · Audience: {content.targetAudience}</>}
          </div>
          <ContentEditor content={content} onChange={setContent} />
        </>
      )}
    </div>
  );
}
