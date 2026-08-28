import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-black/[0.06]", className)} />;
}

export function GeneratingIndicator({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-primary-soft/40 px-6 py-16 text-center">
      <div className="relative flex size-10 items-center justify-center">
        <span className="absolute inline-flex size-10 animate-ping rounded-full bg-primary/30" />
        <span className="relative inline-flex size-4 rounded-full bg-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">This usually takes a few seconds…</p>
    </div>
  );
}
