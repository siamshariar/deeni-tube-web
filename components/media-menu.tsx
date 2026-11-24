// components/media-menu.tsx
// The three-dot menu of every video and short. What it holds depends only on where the video is listed:
//   - everywhere, always first and in this order: Save to Watch later · Save to playlist · Share
//   - "suggested" (Home, a category, a channel's or scholar's page, search, related videos): then Not interested ·
//     Don't recommend channel · Report
//   - "own" (History, Watch later, Liked videos, a playlist): then the list's own actions (Move…, Remove from …, red, last)
// Watch later's own list leaves out the first one: its "Remove from Watch later" is there as the list's own action.
"use client";

import { useState, type ReactElement } from "react";
import { Clock, EyeOff, Flag, UserX } from "lucide-react";
import { ActionMenu, type MenuAction } from "@/components/action-menu";
import { SaveIcon, ShareIcon } from "@/components/icons/action-icons";
import { useDontRecommend } from "@/hooks/useDontRecommend";
import { useWatchLater } from "@/hooks/useWatchLater";
import { openReport, openShare } from "@/lib/dialogs";
import { mediaPath } from "@/lib/media-lookup";
import { openSaveCard } from "@/lib/save-card";
import { cn } from "@/lib/utils";

export interface MenuMedia {
  /** Internal or YouTube id */
  id: string;
  /** YouTube id */
  videoId: string;
  isShort?: boolean;
  title: string;
  channel: string;
  channelId?: string;
  channelAvatar?: string;
  views: string;
  timeAgo: string;
  duration: string;
}

interface MediaMenuProps {
  media: MenuMedia;
  scope: "suggested" | "own";
  /** "suggested": hides it where it is listed (see useNotInterested) */
  onNotInterested?: () => void;
  /** "own": the list's own actions, after Share */
  extra?: MenuAction[];
  /** Leaves out "Save to Watch later" (Watch later's own list) */
  inWatchLater?: boolean;
  trigger?: ReactElement;
}

export function MediaMenu({ media, scope, onNotInterested, extra = [], inWatchLater = false, trigger }: MediaMenuProps) {
  const { toggleWatchLater, isInWatchLater } = useWatchLater();
  const dontRecommend = useDontRecommend();
  const kind = media.isShort ? "short" : "video";

  const actions: MenuAction[] = [
    ...(inWatchLater
      ? []
      : [
          {
            id: "watch-later",
            label: isInWatchLater(media.id) ? "Remove from Watch later" : "Save to Watch later",
            icon: Clock,
            onSelect: () =>
              toggleWatchLater({
                id: media.id,
                videoId: media.videoId,
                type: kind,
                title: media.title,
                channel: media.channel,
                channelAvatar: media.channelAvatar ?? "",
                thumbnail: `https://img.youtube.com/vi/${media.videoId}/hqdefault.jpg`,
                views: media.views,
                timeAgo: media.timeAgo,
                duration: media.duration,
              }),
          },
        ]),
    { id: "playlist", label: "Save to playlist", icon: SaveIcon, opens: true, onSelect: () => openSaveCard({ id: media.id, title: media.title, channel: media.channel }) },
    { id: "share", label: "Share", icon: ShareIcon, opens: true, onSelect: () => openShare(mediaPath(media)) },
  ];
  if (scope === "suggested") {
    const more: MenuAction[] = [];
    if (onNotInterested) more.push({ id: "not-interested", label: "Not interested", icon: EyeOff, onSelect: onNotInterested });
    if (media.channelId) {
      const channelId = media.channelId;
      more.push({ id: "dont-recommend", label: "Don't recommend channel", icon: UserX, onSelect: () => dontRecommend(channelId, media.channel) });
    }
    more.push({ id: "report", label: "Report", icon: Flag, opens: true, onSelect: () => openReport(kind, media.title) });
    more[0] = { ...more[0], divider: true };
    actions.push(...more);
  }
  if (extra.length) actions.push({ ...extra[0], divider: true }, ...extra.slice(1));

  return <ActionMenu actions={actions} title={kind === "short" ? "Short actions" : "Video actions"} trigger={trigger} />;
}

/** "Not interested": the card says so in its own place, with Undo (as on YouTube), so no message is needed. */
export function useNotInterested() {
  const [hidden, setHidden] = useState(false);
  return { hidden, hide: () => setHidden(true), undo: () => setHidden(false) };
}

export function HiddenMedia({ onUndo, short = false, className }: { onUndo: () => void; short?: boolean; className?: string }) {
  return (
    <div role="status" className={cn("flex w-full flex-col items-center justify-center gap-3 rounded-xl bg-muted p-4 text-center", className)}>
      <p className="text-sm leading-5">{short ? "Short removed" : "Video removed"}</p>
      <button
        type="button"
        onClick={onUndo}
        className="h-9 rounded-full bg-background px-4 text-sm font-medium transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Undo
      </button>
    </div>
  );
}
