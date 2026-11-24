// components/action-menu.tsx
// The one three-dot menu: the same rows everywhere, a sheet along the bottom on phones and a menu at the button from md
// up. The pages only say which actions it has (see media-menu.tsx for a video's and a short's).
"use client";

import { Fragment, useRef, useState, type ComponentType, type ReactElement } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreButton } from "@/components/more-button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export interface MenuAction {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  /** Opens a dialog, card or another page: runs once the menu has closed and the focus is back on its button */
  opens?: boolean;
  /** Red: it deletes or removes something */
  danger?: boolean;
  /** A line above it */
  divider?: boolean;
  /** Grey, at the row's end ("On") */
  value?: string;
}

interface ActionMenuProps {
  actions: MenuAction[];
  /** The sheet's name for screen readers */
  title?: string;
  /** Instead of the standard three dots; a button that takes a ref */
  trigger?: ReactElement;
  align?: "start" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const RED = "text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400";
// The button's own presses don't reach a card or row around it. (Only those: React also sends it the presses in the sheet
// or menu, which are elsewhere in the page, and stopping them kept a tap above a sheet from closing it.)
const stop = (e: React.SyntheticEvent) => {
  if (e.currentTarget.contains(e.target as Node)) e.stopPropagation();
};

export function ActionMenu({ actions, title = "Actions", trigger, align = "end", open: openProp, onOpenChange }: ActionMenuProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const after = useRef<(() => void) | null>(null);
  if (actions.length === 0) return null;
  const button = trigger ?? <MoreButton />;

  return (
    <span className="contents" onClick={stop} onKeyDown={stop}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{button}</DrawerTrigger>
          <DrawerContent
            accessibleTitle={title}
            onCloseAutoFocus={() => {
              const run = after.current;
              after.current = null;
              if (run) setTimeout(run);
            }}
          >
            <div className="yt-scrollbar min-h-0 overflow-y-auto overscroll-contain pb-3">
              {actions.map((a) => (
                <Fragment key={a.id}>
                  {a.divider && <div className="my-2 border-t" aria-hidden="true" />}
                  <button
                    type="button"
                    data-action={a.id}
                    onClick={() => {
                      if (a.opens) after.current = a.onSelect;
                      setOpen(false);
                      if (!a.opens) a.onSelect();
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-5 px-4 py-2 text-left text-[15px] leading-5 transition-colors hover:bg-accent active:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                      a.danger && RED
                    )}
                  >
                    <a.icon className="h-6 w-6 flex-shrink-0" />
                    <span className="min-w-0 flex-1">{a.label}</span>
                    {a.value && <span className="text-muted-foreground">{a.value}</span>}
                  </button>
                </Fragment>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
          <DropdownMenuContent align={align} className="w-64">
            {actions.map((a) => (
              <Fragment key={a.id}>
                {a.divider && <DropdownMenuSeparator className="my-2" />}
                <DropdownMenuItem
                  data-action={a.id}
                  className={cn("gap-4", a.danger && RED)}
                  onSelect={a.opens ? undefined : a.onSelect}
                  afterClose={a.opens ? a.onSelect : undefined}
                >
                  <a.icon className="h-5 w-5" />
                  <span className="min-w-0 flex-1">{a.label}</span>
                  {a.value && <span className="text-muted-foreground">{a.value}</span>}
                </DropdownMenuItem>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </span>
  );
}
