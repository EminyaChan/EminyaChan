"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Image as ImageIcon,
  Video,
  Library,
  Star,
  Megaphone,
  LayoutTemplate,
  Building2,
  Settings as SettingsIcon,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generator", label: "Create Content", icon: Sparkles },
  { href: "/library", label: "Content History", icon: Library },
  { href: "/saved", label: "Saved Content", icon: Star },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/images", label: "Image Generator", icon: ImageIcon },
  { href: "/videos", label: "Video Generator", icon: Video },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/brand", label: "Brand Settings", icon: Building2 },
  { href: "/history", label: "AI Usage Log", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <span className="text-sm font-semibold">AI Marketing Studio</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
