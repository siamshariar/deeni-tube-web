// components/dialogs.tsx
// The app's Share, Report and Send feedback dialogs (opened with lib/dialogs.ts). Share and Report are sheets on phones.
"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { closeDialog, type DialogRequest, type ReportKind } from "@/lib/dialogs";
import { notify } from "@/lib/notify";
import { canShareMore, copyText, shareMore, shareOn, shareSites } from "@/lib/share";
import { useScrollRow } from "@/hooks/use-scroll-row";
import { cn } from "@/lib/utils";

const onOpenChange = (open: boolean) => {
  if (!open) closeDialog();
};

export default function Dialogs({ open, request }: { open: boolean; request: DialogRequest }) {
  if (request.type === "share") return <ShareDialog open={open} url={request.url} title={request.title} image={request.image} />;
  if (request.type === "report") return <ReportDialog open={open} kind={request.kind} title={request.title} />;
  return <FeedbackDialog open={open} />;
}

// ── Share ────────────────────────────────────────────────────────────────────

function ShareDialog({ open, url, title, image }: { open: boolean; url: string; title: string; image?: string }) {
  const [copied, setCopied] = useState(false);
  const [sites] = useState(shareSites);
  const { rowRef, more, measure, scroll } = useScrollRow(sites, (width) => width - SHARE_ITEM);
  const copy = async () => {
    if (!(await copyText(url))) return notify("Couldn't copy the link");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Share" className="max-w-[520px]">
      <div className="min-w-0 space-y-5">
        {/* One row, as on YouTube: swiped with a finger, arrows at its ends with a mouse */}
        <div className="relative -mx-4 md:mx-0">
          <div ref={rowRef} role="group" aria-label="Share on" onScroll={measure} className="scrollbar-none flex overflow-x-auto overscroll-x-contain px-2 md:px-0">
            {sites.map((site) => (
              <ShareItem key={site.name} name={site.name} label={site.app ? `Share with ${site.name}` : `Share on ${site.name}`} onClick={() => shareOn(site, url, title, image)}>
                <svg viewBox="0 0 64 64" aria-hidden="true" className="h-[60px] w-[60px] rounded-full">
                  <rect width="64" height="64" fill={site.color} />
                  <path d={site.icon} fill="#fff" />
                </svg>
              </ShareItem>
            ))}
            {canShareMore() && (
              <ShareItem name="More" label="More ways to share" onClick={() => shareMore(url, title)}>
                <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent">
                  <MoreHorizontal className="h-7 w-7" />
                </span>
              </ShareItem>
            )}
          </div>
          {(["left", "right"] as const).map(
            (side) =>
              more[side] && (
                <button
                  key={side}
                  type="button"
                  tabIndex={-1} // the sites themselves are reached with Tab
                  aria-label={side === "left" ? "Previous" : "More sites"}
                  onClick={() => scroll(side === "left" ? -1 : 1)}
                  className={cn("absolute top-[18px] hidden h-10 w-10 items-center justify-center rounded-full border bg-popover shadow-md hover:bg-accent active:bg-accent can-hover:flex", side === "left" ? "-left-2" : "-right-2")}
                >
                  {side === "left" ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
                </button>
              )
          )}
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-muted py-2 dark:bg-white/5 pl-4 pr-2">
          <input type="text" aria-label="Link" value={url} readOnly onFocus={(e) => e.target.select()} className="min-w-0 flex-1 truncate bg-transparent text-base outline-none md:text-sm" />
          <Button type="button" className="h-9 flex-shrink-0 px-4" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

const SHARE_ITEM = 84;
function ShareItem({ name, label, onClick, children }: { name: string; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex w-[84px] flex-shrink-0 flex-col items-center gap-2 rounded-xl py-2 transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {children}
      <span className="text-xs leading-4">{name}</span>
    </button>
  );
}

// ── Report ───────────────────────────────────────────────────────────────────

const REPORT_REASONS = ["Violent or repulsive content", "Hateful or abusive content", "Harmful or dangerous acts", "Spam or misleading", "Child abuse"];

function ReportDialog({ open, kind, title }: { open: boolean; kind: ReportKind; title: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const submit = () => {
    if (!selected) return;
    try {
      const reports = JSON.parse(localStorage.getItem("reportHistory") || "[]");
      reports.unshift({ id: `r${Date.now()}`, title, kind, status: "Pending", date: "Just now", result: "Under review", type: selected });
      localStorage.setItem("reportHistory", JSON.stringify(reports));
    } catch {}
    closeDialog();
    notify("Thanks for reporting");
  };
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={`Report ${kind}`}>
      <div>
        <p className="mb-3 line-clamp-2 text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]">{title}</p>
        <div role="radiogroup" aria-label="Reason" className="-mx-2">
          {REPORT_REASONS.map((reason) => {
            const on = selected === reason;
            return (
              <button
                key={reason}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSelected(reason)}
                className="flex min-h-11 w-full items-center gap-4 rounded-lg px-2 py-2 text-left text-[15px] leading-5 transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={cn("flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2", on ? "border-foreground" : "border-muted-foreground")}>
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-foreground" />}
                </span>
                {reason}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={closeDialog}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={!selected}>Report</Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

// ── Send feedback ────────────────────────────────────────────────────────────

function FeedbackDialog({ open }: { open: boolean }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const send = () => {
    if (!text.trim()) return;
    setSent(true);
    setTimeout(closeDialog, 1500);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>Help us improve Deeni.tube. Share your thoughts, suggestions, or report issues.</DialogDescription>
        </DialogHeader>
        {sent ? (
          <div role="status" className="flex flex-col items-center py-8 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted dark:bg-white/10">
              <Check className="h-8 w-8" aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold leading-7">Thank you</p>
            <p className="mt-1 text-sm text-muted-foreground">Your feedback has been sent.</p>
          </div>
        ) : (
          <>
            <Textarea aria-label="Your feedback" placeholder="Write your feedback here" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[120px] resize-none" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button type="button" onClick={send} disabled={!text.trim()}>Send</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
