// lib/dialogs.ts
// The Share, Report and Send feedback dialogs, opened from anywhere. One of each for the whole app (components/dialogs-host,
// in app/layout.tsx), so every page's "Share" and "Report" open the same thing.
import { useSyncExternalStore } from "react";
import { shareUrl } from "@/lib/share-path";

export type ReportKind = "video" | "short" | "channel" | "scholar" | "comment";

export type DialogRequest =
  | { type: "share"; url: string; title: string; image?: string }
  | { type: "report"; kind: ReportKind; title: string }
  | { type: "feedback" };

interface DialogState {
  open: boolean;
  request: DialogRequest;
  /** Goes up each time one opens, so it starts afresh */
  opened: number;
}

let state: DialogState | null = null;
const listeners = new Set<() => void>();
const set = (next: DialogState | null) => {
  state = next;
  listeners.forEach((l) => l());
};
const open = (request: DialogRequest) => set({ open: true, request, opened: (state?.opened ?? 0) + 1 });

/** Share a page of this site (a path), or a full link; its title and picture go along where the site takes them. */
export const openShare = (url: string, title = "", image?: string) => open({ type: "share", url: shareUrl(url), title, image });
export const openReport = (kind: ReportKind, title: string) => open({ type: "report", kind, title });
export const openFeedback = () => open({ type: "feedback" });
export const closeDialog = () => {
  if (state?.open) set({ ...state, open: false });
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const useDialogState = () => useSyncExternalStore(subscribe, () => state, () => null);
