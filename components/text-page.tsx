// components/text-page.tsx
// A text page (Help's and More's pages, Donate): the app bar with its title on phones; from md up an icon, the title and
// a line under it, and a button back to the page it belongs to.
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { PageBar } from "@/components/page-bar";
import { BOX, BOX_TITLE, PAGE_NARROW, PAGE_SUBTITLE, PAGE_TITLE, PAGE_UNDER_BAR } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TextPageProps {
  title: string;
  /** On phones' app bar, when the page shows a heading of its own in its content */
  ownHeading?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  parent: string;
  /** The button back, from md up ("Back to Help") */
  backLabel?: string;
  children: ReactNode;
}

export function TextPage({ title, ownHeading = false, subtitle, icon: Icon, parent, backLabel, children }: TextPageProps) {
  return (
    <div className="min-h-screen bg-background pt-14">
      <PageBar as={ownHeading ? "p" : "h1"} title={title} parent={parent} />
      <div className={cn(PAGE_UNDER_BAR, PAGE_NARROW, "md:mt-2")}>
        {!ownHeading && (
          <div className="mb-6 hidden items-center gap-4 md:flex">
            <IconCircle icon={Icon} className="h-12 w-12 [&_svg]:h-6 [&_svg]:w-6" />
            <div className="min-w-0">
              <h1 className={PAGE_TITLE}>{title}</h1>
              {subtitle && <p className={cn(PAGE_SUBTITLE, "mt-0.5")}>{subtitle}</p>}
            </div>
          </div>
        )}
        {children}
        {backLabel && (
          <Button asChild variant="outline" className="mt-6 hidden md:inline-flex">
            <Link href={parent}>
              <ArrowLeft /> {backLabel}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/** The page's own heading, in the middle (Rate, Donate) */
export function TextHero({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <IconCircle icon={Icon} className="mb-4 h-16 w-16 [&_svg]:h-8 [&_svg]:w-8" />
      <h1 className={PAGE_TITLE}>{title}</h1>
      <p className={cn(PAGE_SUBTITLE, "mt-2 max-w-md")}>{children}</p>
    </div>
  );
}

export function IconCircle({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("flex flex-shrink-0 items-center justify-center rounded-full bg-muted dark:bg-white/10", className)}>
      <Icon aria-hidden="true" />
    </span>
  );
}

/** A box with a heading and text */
export function TextBox({ icon: Icon, title, children, className }: { icon?: LucideIcon; title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn(BOX, "p-4", className)}>
      <h2 className={cn(BOX_TITLE, "mb-2 flex items-center gap-2")}>
        {Icon && <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />}
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 leading-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** After sending something: the page says so itself */
export function DoneNote({ icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center py-8 text-center">
      <IconCircle icon={icon} className="mb-4 h-16 w-16 [&_svg]:h-8 [&_svg]:w-8" />
      <p className="text-lg font-semibold leading-7">{title}</p>
      <div className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">{children}</div>
    </div>
  );
}
