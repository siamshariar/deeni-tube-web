// components/link-row.tsx
// A row that opens a page (Settings, You, More, Help): an icon in a 40px circle, a 15px label with a 13px line under it,
// and a chevron. Rows go in a LinkBox.
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { BOX } from "@/components/page-layout";
import { cn } from "@/lib/utils";

export function LinkBox({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(BOX, "divide-y overflow-hidden", className)}>{children}</div>;
}

export function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
      <Icon className="h-5 w-5" />
    </span>
  );
}

export function LinkRow({ href, icon, label, description }: { href: string; icon: LucideIcon; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-4 py-3 transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring can-hover:hover:bg-muted/60"
    >
      <RowIcon icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-5">{label}</span>
        <span className="block text-[13px] leading-5 text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
