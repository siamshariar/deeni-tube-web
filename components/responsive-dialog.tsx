// components/responsive-dialog.tsx
// A dialog that is a sheet along the bottom on phones, with the same title bar everywhere.
"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitleBar } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function ResponsiveDialog({ open, onOpenChange, title, children, className }: ResponsiveDialogProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent accessibleTitle={null}>
          <DrawerTitleBar title={title} />
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className={cn("max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
