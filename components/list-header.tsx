// components/list-header.tsx
// The top of a list page: its title (and a line under it), with the search box and a button beside it. On phones and
// tablets the search row goes under the title.
import type { ReactNode } from "react";
import { PAGE_SUBTITLE, PAGE_TITLE } from "@/components/page-layout";
import { cn } from "@/lib/utils";

interface ListHeaderProps {
  title: string;
  /** Not on phones, where the app bar says it */
  titleInBar?: boolean;
  subtitle?: ReactNode;
  /** The search box and what stands beside it */
  children: ReactNode;
}

export function ListHeader({ title, titleInBar = false, subtitle, children }: ListHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className={cn("min-w-0", titleInBar && !subtitle && "hidden md:block")}>
        <h1 className={cn(PAGE_TITLE, titleInBar && "hidden md:block")}>{title}</h1>
        {subtitle && <div className={cn(PAGE_SUBTITLE, titleInBar && "mt-0 md:mt-1")}>{subtitle}</div>}
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 lg:-mt-1 lg:w-auto lg:flex-shrink-0">{children}</div>
    </div>
  );
}

/** The search box's width beside the title */
export const LIST_SEARCH = "min-w-[8.5rem] flex-1 lg:w-72 lg:flex-none";
