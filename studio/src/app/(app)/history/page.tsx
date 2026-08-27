"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { History } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface HistoryItem {
  id: string;
  type: "TEXT" | "IMAGE" | "VIDEO";
  provider: string;
  model: string | null;
  status: "SUCCESS" | "ERROR" | "FALLBACK";
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  content: { id: string; title: string } | null;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [totals, setTotals] = useState<{ count: number; promptTokens: number; completionTokens: number; estimatedCostUsd: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: HistoryItem[]; totals: typeof totals }>("/api/history")
      .then((r) => {
        setItems(r.items);
        setTotals(r.totals);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      {totals && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Total generations" value={totals.count.toString()} />
          <Stat label="Prompt tokens" value={totals.promptTokens.toLocaleString()} />
          <Stat label="Completion tokens" value={totals.completionTokens.toLocaleString()} />
          <Stat label="Estimated cost" value={`$${totals.estimatedCostUsd.toFixed(4)}`} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
            <History className="size-8" />
            <p className="text-sm">No generations yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Content</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Est. cost</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{h.type}</td>
                  <td className="px-4 py-3">
                    {h.content ? (
                      <Link href={`/library/${h.content.id}`} className="text-primary hover:underline">
                        {h.content.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{h.provider}</td>
                  <td className="px-4 py-3 text-muted-foreground">{h.model ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={h.status === "SUCCESS" ? "success" : h.status === "FALLBACK" ? "warning" : "danger"}>{h.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {h.promptTokens != null ? `${h.promptTokens} / ${h.completionTokens}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{h.estimatedCostUsd != null ? `$${h.estimatedCostUsd.toFixed(5)}` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(h.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardBody>
    </Card>
  );
}
