// components/save-card.tsx
// YouTube's "Save to..." card: opens at the button that was pressed (a bottom sheet on phones), with a row per
// playlist (its cover, name, privacy, and a bookmark that's filled once the video is in it) and "New playlist" at the
// bottom. As on YouTube, a choice saves (or removes) and closes it, and the message says so, with Change or Undo.
// Opened with openSaveCard() from lib/save-card.ts. The card's shape (12px corners, soft shadow, 48px header, footer
// button) is YouTube's popup, measured on youtube.com.
"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ArrowLeft, Clock, ListVideo, Plus, X } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "@/components/icons/action-icons";
import { PlaylistNameField, PrivacySelect } from "@/components/playlist-fields";
import { LIKED_PLAYLIST_ID, WATCH_LATER_PLAYLIST_ID, usePlaylists } from "@/hooks/usePlaylists";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMenuDismiss } from "@/hooks/use-menu-dismiss";
import { useWatchLater } from "@/hooks/useWatchLater";
import { canonicalMediaId, findPlayable, mediaThumb, youtubeThumb } from "@/lib/media-lookup";
import { closeSaveCard, openSaveCard, type SaveCardVideo } from "@/lib/save-card";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export default function SaveCard({ open, video, anchor }: { open: boolean; video: SaveCardVideo; anchor: { getBoundingClientRect: () => DOMRect } }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const contentRef = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState(false);
  const virtualRef = useMemo(() => ({ current: anchor }), [anchor]);

  // As every menu: scrolling closes it (not while a new playlist is being typed), and so does a click outside, which
  // does nothing else
  useMenuDismiss(open && !isMobile, {
    isInMenu: (t) => t instanceof Element && (!!contentRef.current?.contains(t) || !!t.closest('[role="menu"]')),
    isTrigger: () => false,
    onDismiss: (by) => {
      if (by === "click" || !creating) closeSaveCard();
    },
  });

  const body = <SaveCardBody video={video} creating={creating} onCreating={setCreating} sheet={isMobile} />;
  const onOpenChange = (next: boolean) => {
    if (!next) closeSaveCard();
  };

  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent accessibleTitle="Save to..." className="max-h-[85dvh]">
          {body}
        </DrawerContent>
      </Drawer>
    );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor virtualRef={virtualRef} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={contentRef}
          role="dialog"
          aria-label="Save to..."
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            "z-50 flex max-h-[var(--radix-popover-content-available-height)] w-[300px] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-[0_4px_32px_rgba(0,0,0,0.1)] outline-none dark:border-transparent",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {body}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function SaveCardBody({ video, creating, onCreating, sheet }: { video: SaveCardVideo; creating: boolean; onCreating: (on: boolean) => void; sheet: boolean }) {
  const { playlists, addVideoToPlaylist, removeVideoFromPlaylist, createPlaylist } = usePlaylists();
  const { isInWatchLater } = useWatchLater();
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const key = canonicalMediaId(video.id);
  const thumb = mediaThumb(video.id);
  // Liked videos isn't offered (that's the Like button), as on YouTube
  const lists = playlists.filter((pl) => pl.id !== LIKED_PLAYLIST_ID);
  const change = { label: "Change", onClick: () => openSaveCard(video) };

  const choose = (id: string, listName: string, saved: boolean) => {
    closeSaveCard();
    if (saved) notify(`Removed from ${listName}`, { undo: removeVideoFromPlaylist(id, video.id), thumb });
    else if (addVideoToPlaylist(id, video)) notify(`Saved to ${listName}`, { action: change, thumb });
  };
  const create = () => {
    const listName = name.trim();
    if (!listName) return;
    addVideoToPlaylist(createPlaylist(listName, isPublic), video);
    closeSaveCard();
    notify(`Saved to ${listName}`, { action: change, thumb });
  };

  if (creating)
    return (
      <>
        <div className={cn("flex flex-shrink-0 items-center gap-1 border-b", sheet ? "pb-1 pl-1 pr-4" : "min-h-12 py-1 pl-2 pr-4")}>
          <button type="button" aria-label="Back" onClick={() => onCreating(false)} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent active:bg-accent">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className={sheet ? "text-lg font-semibold leading-7" : "text-base font-medium"}>New playlist</h2>
        </div>
        <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-4">
          <PlaylistNameField value={name} onChange={setName} onEnter={create} autoFocus />
          <PrivacySelect isPublic={isPublic} onChange={setIsPublic} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onCreating(false)}>Cancel</Button>
            <Button type="button" onClick={create} disabled={!name.trim()}>Create</Button>
          </div>
        </div>
      </>
    );

  return (
    <>
      {sheet ? (
        // As every sheet's title (ui/drawer)
        <div className="flex flex-shrink-0 items-center justify-between border-b pb-1 pl-4 pr-1">
          <h2 className="text-lg font-semibold leading-7">Save to...</h2>
          <button type="button" aria-label="Close" onClick={closeSaveCard} className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-accent">
            <X className="h-6 w-6" />
          </button>
        </div>
      ) : (
        <div className="flex min-h-12 flex-shrink-0 items-center border-b px-4">
          <h2 className="text-base font-medium">Save to...</h2>
        </div>
      )}
      <ul className="yt-scrollbar max-h-[min(336px,50dvh)] min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
        {lists.map((pl) => {
          const watchLater = pl.id === WATCH_LATER_PLAYLIST_ID;
          const saved = watchLater ? isInWatchLater(video.id) : pl.videoIds.includes(key);
          const label = watchLater ? "Watch later" : pl.name;
          const cover = pl.videoIds[0] ? findPlayable(pl.videoIds[0])?.videoId : undefined;
          return (
            <li key={pl.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={saved}
                onClick={() => choose(pl.id, label, saved)}
                className="flex min-h-12 w-full items-center gap-3 px-4 py-1.5 text-left transition-colors hover:bg-accent active:bg-accent kb:focus-visible:bg-accent focus-visible:outline-none"
              >
                {/* Its cover, as a little stack */}
                <span aria-hidden="true" className="relative w-16 flex-shrink-0 pt-[3px]">
                  <span className="absolute inset-x-1.5 top-0 h-[3px] rounded-t-[3px] bg-foreground/25" />
                  <span className="relative flex h-9 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">
                    {cover ? <Image src={youtubeThumb(cover, "small")} alt="" fill sizes="64px" className="object-cover" /> : watchLater ? <Clock /> : <ListVideo />}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm leading-5">{label}</span>
                  <span className="block truncate text-xs leading-[18px] text-muted-foreground">{pl.isPublic ? "Public" : "Private"}</span>
                </span>
                <SaveIcon filled={saved} className="h-6 w-6 flex-shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex-shrink-0 border-t p-3 pb-[max(12px,env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={() => onCreating(true)}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-muted text-sm font-medium transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/10 dark:hover:bg-white/20 dark:active:bg-white/20"
        >
          <Plus className="h-5 w-5" /> New playlist
        </button>
      </div>
    </>
  );
}
