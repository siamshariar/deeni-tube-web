'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'

import { useMenuDismiss } from '@/hooks/use-menu-dismiss'
import { cn } from '@/lib/utils'

// What the menu and its parts share: what to run once it has closed and focus is back on its button
// (DropdownMenuItem's `afterClose`), whether scrolling closed it, and its own element
type MenuShared = { afterClose: (() => void) | null; closedByScroll: boolean; content: HTMLElement | null }
const MenuContext = React.createContext<React.MutableRefObject<MenuShared> | null>(null)

type DropdownMenuProps = React.ComponentProps<typeof DropdownMenuPrimitive.Root> & {
  /** The page scrolls while the menu is open, which closes it (default). false: a popup of the fixed header, which
   *  stays open and lets clicks through to the page */
  closeOnScroll?: boolean
}

/**
 * A menu. The page (and any list in it, such as the related videos) still scrolls while it's open, and scrolling
 * closes it (hooks/use-menu-dismiss): Radix's own "modal" menus lock the page instead.
 */
function DropdownMenu({ open: openProp, defaultOpen, onOpenChange, closeOnScroll = true, ...props }: DropdownMenuProps) {
  const [openState, setOpenState] = React.useState(defaultOpen ?? false)
  const open = openProp ?? openState
  const shared = React.useRef<MenuShared>({ afterClose: null, closedByScroll: false, content: null })
  const setOpen = (next: boolean) => {
    if (next) shared.current.closedByScroll = false
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }
  useMenuDismiss(open && closeOnScroll, {
    isInMenu: (t) => t instanceof Node && !!shared.current.content?.contains(t),
    isTrigger: (t) => t instanceof Element && !!t.closest('[aria-haspopup="menu"]'),
    onDismiss: (by) => {
      shared.current.closedByScroll = by === 'scroll'
      setOpen(false)
    },
  })

  return (
    <MenuContext.Provider value={shared}>
      <DropdownMenuPrimitive.Root modal={false} open={open} onOpenChange={setOpen} {...props} />
    </MenuContext.Provider>
  )
}

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-popover py-2 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, collisionPadding = 8, onCloseAutoFocus, onPointerDownOutside, ...props }, ref) => {
  const shared = React.useContext(MenuContext)
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={(el) => {
          if (shared) shared.current.content = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        onPointerDownOutside={(e) => {
          onPointerDownOutside?.(e)
          // Its own button opens and closes it; dismissing here too would close a menu opened again while it fades out
          const button = shared?.current.content?.getAttribute('aria-labelledby')
          if (button && e.target instanceof Element && e.target.closest(`#${CSS.escape(button)}`)) e.preventDefault()
        }}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus?.(e)
          if (!shared) return
          // Giving the focus back to its button would scroll the page back to it
          if (shared.current.closedByScroll) e.preventDefault()
          const run = shared.current.afterClose
          shared.current.afterClose = null
          if (run) setTimeout(run)
        }}
        className={cn(
          'yt-scrollbar z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border bg-popover py-2 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
})
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
    /** Opens a dialog: runs once the menu has closed, so the menu isn't left open under the dialog */
    afterClose?: () => void
  }
>(({ className, inset, afterClose, onSelect, ...props }, ref) => {
  const shared = React.useContext(MenuContext)
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      onSelect={(e) => {
        onSelect?.(e)
        if (afterClose && shared) shared.current.afterClose = afterClose
      }}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-3 px-4 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  )
})
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'px-4 py-2 text-sm font-medium',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('my-2 h-px bg-border', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
