// components/empty-state.tsx
// What a page or list shows when there is nothing in it.
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Buttons under the text */
  children?: ReactNode;
  /** "h1" when it is all the page shows */
  as?: "h1" | "h2" | "h3";
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, children, as: Title = "h2", className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-16 text-center", className)}>
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </span>
      <Title className="text-lg font-semibold leading-7">{title}</Title>
      {description && <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">{description}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
