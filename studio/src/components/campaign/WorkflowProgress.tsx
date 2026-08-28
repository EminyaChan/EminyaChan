import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignDTO, ContentDTO } from "@/lib/types";

const STAGES = ["Brief", "Strategy", "Calendar", "Content", "Visual", "Approval", "Schedule", "Publish"] as const;

function stagesReached(campaign: CampaignDTO): number {
  const contents = campaign.contents ?? [];
  let n = 1; // Brief is done the moment a campaign exists
  if (campaign.strategy) n = 2;
  if (contents.length > 0) n = 3;
  if (contents.some((c) => c.status !== "IDEA")) n = 4;
  if (contents.some((c) => (c as ContentDTO).images?.length)) n = 5;
  if (contents.some((c) => ["APPROVED", "SCHEDULED", "PUBLISHED"].includes(c.status))) n = 6;
  // Note: scheduledDate alone means "planned for this date" (set as soon as
  // a calendar item exists) — it does NOT mean it has cleared approval and
  // been scheduled to publish, so this stage keys off status only.
  if (contents.some((c) => c.status === "SCHEDULED" || c.status === "PUBLISHED")) n = 7;
  if (contents.some((c) => c.status === "PUBLISHED")) n = 8;
  return n;
}

export function WorkflowProgress({ campaign }: { campaign: CampaignDTO }) {
  const reached = stagesReached(campaign);

  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {STAGES.map((stage, i) => {
        const stepNum = i + 1;
        const done = stepNum < reached;
        const current = stepNum === reached;
        return (
          <div key={stage} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done && "bg-accent text-white",
                  current && !done && "bg-primary text-primary-foreground",
                  !done && !current && "bg-black/5 text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" /> : stepNum}
              </div>
              <span className={cn("whitespace-nowrap text-[11px] font-medium", current ? "text-primary" : done ? "text-accent" : "text-muted-foreground")}>
                {stage}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={cn("mb-4 h-px w-6 shrink-0 sm:w-10", stepNum < reached ? "bg-accent" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
