"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/generator", label: "AI Content Generator" },
  { href: "/images", label: "Image Generator" },
  { href: "/videos", label: "Video Generator" },
  { href: "/library", label: "Content Library" },
  { href: "/templates", label: "Templates" },
  { href: "/brand", label: "Brand Settings" },
  { href: "/history", label: "Generation History" },
  { href: "/settings", label: "Settings" },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/generator": "AI Content Generator",
  "/images": "Image Generator",
  "/videos": "Video Generator",
  "/library": "Content Library",
  "/templates": "Templates",
  "/brand": "Brand Settings",
  "/history": "Generation History",
  "/settings": "Settings",
};

export function Topbar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const title = Object.entries(TITLES).find(([href]) => pathname.startsWith(href))?.[1] ?? "AI Marketing Studio";

  // Portals need a browser `document`, so defer rendering until after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button className="text-foreground md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-black/5 hover:text-foreground"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>

      {mounted && mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-30 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-surface p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="size-4" />
                  </div>
                  <span className="text-sm font-semibold">AI Marketing Studio</span>
                </div>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              <nav className="space-y-0.5">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium",
                      pathname.startsWith(item.href) ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-black/5"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
