// components/dialogs.tsx
// The app's Share, Report and Send feedback dialogs (opened with lib/dialogs.ts). Share and Report are sheets on phones.
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { closeDialog, type DialogRequest, type ReportKind } from "@/lib/dialogs";
import { notify } from "@/lib/notify";
import { openShareIntent } from "@/lib/share";
import { cn } from "@/lib/utils";

const onOpenChange = (open: boolean) => {
  if (!open) closeDialog();
};

export default function Dialogs({ open, request }: { open: boolean; request: DialogRequest }) {
  if (request.type === "share") return <ShareDialog open={open} url={request.url} />;
  if (request.type === "report") return <ReportDialog open={open} kind={request.kind} title={request.title} />;
  return <FeedbackDialog open={open} />;
}

// ── Share ────────────────────────────────────────────────────────────────────

const sharePlatforms = [
  {
    name: "Facebook",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-12 w-12">
        <linearGradient id="fb5" x1="9.993%" x2="89.993%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#18B5FE" />
          <stop offset="100%" stopColor="#1277F2" />
        </linearGradient>
        <path fill="url(#fb5)" d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" />
        <path fill="#fff" d="M26.707 36.301V25.5h3.613l.543-4.215h-4.156v-2.699c0-1.227.336-2.054 2.082-2.054h2.227V12.66c-.387-.047-1.707-.16-3.25-.16-3.207 0-5.41 1.957-5.41 5.559v3.102H19v4.215h3.656V36.3h4.051z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-12 w-12">
        <path fill="#fff" d="M4.9 43.3l2.7-9.8C5.5 30.3 4.5 26.7 4.5 23 4.5 12.3 13.3 3.5 24 3.5S43.5 12.3 43.5 23 34.7 42.5 24 42.5c-3.5 0-6.9-.9-9.9-2.7l-9.2 3.5z" />
        <path fill="#25D366" d="M24 5c9.9 0 18 8.1 18 18s-8.1 18-18 18c-3.2 0-6.2-.8-8.9-2.4l-1-.6-5.5 2.1 1.5-5.3-.7-1.1C5.7 31.1 5 28.6 5 26 5 16.1 13.1 8 23 8h1v-3z" />
        <path fill="#fff" d="M35.5 26.8c-.4-.2-2.6-1.3-3-1.4-.4-.2-.7-.3-1 .2-.3.4-1.1 1.4-1.4 1.7-.3.3-.5.3-1 .1-.4-.2-1.9-.7-3.6-2.3-1.3-1.2-2.2-2.7-2.5-3.1-.3-.4 0-.7.2-.9.2-.2.4-.5.7-.8.2-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.2-.9-2.4-1.2-3.3-.3-.9-.7-.8-1-.8-.3 0-.6 0-.9 0-.3 0-.8.1-1.2.6-.4.5-1.6 1.5-1.6 3.7s1.6 4.3 1.8 4.6c.2.3 3.2 4.9 7.7 6.9 1.1.5 1.9.8 2.6 1 1.1.3 2.1.3 2.9.2.9-.1 2.6-1.1 3-2.1.4-1 .4-1.9.3-2.1-.2-.2-.4-.3-.8-.5z" />
      </svg>
    ),
  },
  {
    name: "X",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-12 w-12">
        <path fill="#000" d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" />
        <path fill="#fff" d="M13 14h7.5l5.6 8 8.9-8h3.5l-10.3 9.3L38 34h-7.5l-6.3-9-9.2 9H11l10.8-9.8L13 14zm5 2.5h3l13 15h-3l-13-15z" />
      </svg>
    ),
  },
]

function ShareDialog({ open, url }: { open: boolean; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => notify("Couldn't copy the link")
    );
  };
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Share" className="max-w-[480px]">
      <div className="space-y-5">
        <div className="flex gap-4">
          {sharePlatforms.map((p) => (
            <button
              type="button"
              key={p.name}
              onClick={() => openShareIntent(p.name, url)}
              aria-label={`Share on ${p.name}`}
              className="flex w-[72px] flex-col items-center gap-2 rounded-xl py-2 transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {p.icon}
              <span className="text-xs leading-4">{p.name}</span>
            </button>
          ))}
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
