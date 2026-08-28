import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-black/5 text-foreground",
  primary: "bg-primary-soft text-primary",
  success: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "GENERATED":
      return "primary";
    case "ARCHIVED":
      return "neutral";
    case "DRAFT":
      return "warning";
    default:
      return "neutral";
  }
}
