import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, statusTone } from "@/components/ui/Badge";
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, STATUS_LABELS, formatDate } from "@/lib/utils";
import { QUICK_GENERATE_PRESETS } from "@/lib/constants";
import { Sparkles, ArrowRight, Library, Building2 } from "lucide-react";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [recent, counts, brandCount] = await Promise.all([
    prisma.content.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { images: { take: 1, orderBy: { createdAt: "desc" } } },
    }),
    prisma.content.groupBy({ by: ["status"], where: { userId }, _count: true }),
    prisma.brand.count({ where: { userId } }),
  ]);

  const totalContent = counts.reduce((sum, c) => sum + c._count, 0);
  const published = counts.find((c) => c.status === "PUBLISHED")?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total content" value={totalContent} />
        <StatCard label="Published" value={published} />
        <StatCard label="Brand profiles" value={brandCount} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Quick Generate</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK_GENERATE_PRESETS.map((preset) => (
            <Link
              key={preset.label}
              href={`/generator?platform=${preset.platform}&contentType=${preset.contentType}`}
              className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary hover:bg-primary-soft/40"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Sparkles className="size-4" />
              </div>
              <span className="text-sm font-medium">{preset.label}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                Generate <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Content</h2>
          <Link href="/library" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <Library className="size-3.5" /> View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
              <Building2 className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">You haven&apos;t generated any content yet.</p>
              <Link href="/generator" className="text-sm font-medium text-primary hover:underline">
                Generate your first piece →
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recent.map((item) => (
              <Link key={item.id} href={`/library/${item.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardBody className="flex h-full flex-col gap-2">
                    {item.images[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0].url} alt="" className="h-24 w-full rounded-lg border border-border object-cover" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center rounded-lg bg-primary-soft/40 text-xs text-muted-foreground">
                        {PLATFORM_LABELS[item.platform]}
                      </div>
                    )}
                    <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone="primary">{PLATFORM_LABELS[item.platform]}</Badge>
                      <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                    </div>
                    <div className="mt-auto text-xs text-muted-foreground">
                      {item.industry || "—"} · {CONTENT_TYPE_LABELS[item.contentType]} · {formatDate(item.createdAt)}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardBody>
    </Card>
  );
}
