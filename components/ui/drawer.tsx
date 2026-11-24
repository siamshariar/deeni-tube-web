"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Bottom-sheet Drawer built on Radix UI Dialog — no vaul, no script-tag injection
const Drawer = DialogPrimitive.Root
Drawer.displayName = "Drawer"

const DrawerTrigger = DialogPrimitive.Trigger
DrawerTrigger.displayName = "DrawerTrigger"

const DrawerClose = DialogPrimitive.Close
DrawerClose.displayName = "DrawerClose"

const DrawerPortal = DialogPrimitive.Portal

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DrawerOverlay.displayName = "DrawerOverlay"

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Screen-reader name for the sheet. Pass null when the drawer renders its own DrawerTitle. */
    accessibleTitle?: string | null
  }
>(({ className, children, accessibleTitle = "Options", style, ...props }, ref) => {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const [pulled, setPulled] = React.useState<number | null>(null)
  const start = React.useRef(0)
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DialogPrimitive.Content
        ref={ref}
        aria-describedby={undefined}
        className={cn(
          "safe-x fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-popover text-popover-foreground pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.15)] outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className,
        )}
        style={{ ...style, ...(pulled ? { transform: `translateY(${pulled}px)` } : null) }}
        {...props}
      >
        {accessibleTitle !== null && <DialogPrimitive.Title className="sr-only">{accessibleTitle}</DialogPrimitive.Title>}
        {/* The handle: pulled down, it closes the sheet */}
        <div
          data-sheet-handle=""
          className="flex h-6 w-full flex-shrink-0 touch-none items-center justify-center"
          onPointerDown={(e) => {
            start.current = e.clientY
            setPulled(0)
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (pulled !== null) setPulled(Math.max(0, e.clientY - start.current))
          }}
          onPointerUp={() => {
            if ((pulled ?? 0) <= 64) return setPulled(null)
            closeRef.current?.click()
            setTimeout(() => setPulled(null), 300) // once it has gone: this part stays for the next time it opens
          }}
          onPointerCancel={() => setPulled(null)}
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {children}
        <DialogPrimitive.Close ref={closeRef} tabIndex={-1} aria-hidden="true" className="hidden" />
      </DialogPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

/** A sheet's title with its close button (use accessibleTitle={null} on the DrawerContent) */
const DrawerTitleBar = ({ title, count, className }: { title: string; /** Beside it, grey */ count?: number; className?: string }) => (
  <div className={cn("flex flex-shrink-0 items-center justify-between border-b pb-1 pl-4 pr-1", className)}>
    <div className="flex min-w-0 items-center gap-2">
      <DialogPrimitive.Title className="text-lg font-semibold leading-7">{title}</DialogPrimitive.Title>
      {count !== undefined && <span className="text-base text-muted-foreground">{count}</span>}
    </div>
    <DialogPrimitive.Close
      aria-label="Close"
      className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <X className="h-6 w-6" />
    </DialogPrimitive.Close>
  </div>
)
DrawerTitleBar.displayName = "DrawerTitleBar"

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DrawerTitle.displayName = "DrawerTitle"

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = "DrawerDescription"

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerTitleBar,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
