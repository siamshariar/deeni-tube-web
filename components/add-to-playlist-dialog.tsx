"use client";

// The "Save to..." dialog, as on YouTube: a checkbox per playlist (ticking saves, unticking removes, and
// the dialog stays open), then "Create new playlist", which opens a name field and a privacy picker.
import { useState } from "react";
import { Check, Globe, Lock, Plus, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlaylistNameField, PrivacySelect } from "@/components/playlist-fields";
import { LIKED_PLAYLIST_ID, WATCH_LATER_PLAYLIST_ID, usePlaylists } from "@/hooks/usePlaylists";
import { useWatchLater } from "@/hooks/useWatchLater";
import { canonicalVideoId } from "@/lib/media-lookup";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AddToPlaylistDialogProps {
  video: { id: string; title: string; channel: string };
  children?: React.ReactNode;
  onAdded?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddToPlaylistDialog({ video, children, onAdded, open: externalOpen, onOpenChange }: AddToPlaylistDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);
  // Start with the list (not the form) and an empty form each time the dialog opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setCreating(false); setNewPlaylistName(""); setNewPlaylistPublic(false); }
  }
  const setOpen = (o: boolean) => (onOpenChange ?? setInternalOpen)(o);
  const { playlists, addVideoToPlaylist, removeVideoFromPlaylist, createPlaylist } = usePlaylists();
  const { isInWatchLater } = useWatchLater();

  const videoKey = canonicalVideoId(video.id);
  // Liked videos isn't offered (that's the Like button), as on YouTube
  const lists = playlists.filter((pl) => pl.id !== LIKED_PLAYLIST_ID);
  const isSavedIn = (pl: (typeof lists)[number]) =>
    pl.id === WATCH_LATER_PLAYLIST_ID ? isInWatchLater(video.id) : pl.videoIds.includes(videoKey);

  const toggle = (playlistId: string, name: string, saved: boolean) => {
    if (saved) {
      removeVideoFromPlaylist(playlistId, video.id);
      toast(`Removed from "${name}"`);
      return;
    }
    if (!addVideoToPlaylist(playlistId, video)) {
      toast(`Already in "${name}"`);
      return;
    }
    toast.success(`Saved to "${name}"`);
    onAdded?.();
  };

  const handleCreateAndAdd = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const newId = createPlaylist(name, newPlaylistPublic);
    addVideoToPlaylist(newId, video);
    toast.success(`Saved to "${name}"`);
    onAdded?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent
        aria-describedby={undefined}
        className="w-[calc(100%-32px)] max-w-[360px] gap-0 rounded-xl p-0 sm:rounded-xl [&>button.absolute]:hidden"
      >
        <div className="flex items-center justify-between py-2 pl-6 pr-2">
          <DialogTitle className="text-base font-medium leading-6 tracking-normal">Save video to...</DialogTitle>
          <DialogClose asChild>
            <button type="button" aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent">
              <X className="h-6 w-6" />
            </button>
          </DialogClose>
        </div>

        <ul className="yt-scrollbar max-h-[min(288px,40dvh)] overflow-y-auto overscroll-contain pb-2">
          {lists.map((pl) => {
            const saved = isSavedIn(pl);
            const PrivacyIcon = pl.isPublic ? Globe : Lock;
            return (
              <li key={pl.id}>
                <label className="relative flex min-h-11 cursor-pointer items-center gap-4 px-6 py-2 transition-colors hover:bg-accent">
                  <input type="checkbox" checked={saved} onChange={() => toggle(pl.id, pl.name, saved)} className="peer sr-only" />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[3px] border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                      saved ? "border-foreground bg-foreground text-background" : "border-foreground/80"
                    )}
                  >
                    {saved && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{pl.name}</span>
                  <PrivacyIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-label={pl.isPublic ? "Public" : "Private"} />
                </label>
              </li>
            );
          })}
        </ul>

        <div className="border-t">
          {creating ? (
            <div className="space-y-3 px-6 pb-5 pt-4">
              <PlaylistNameField value={newPlaylistName} onChange={setNewPlaylistName} onEnter={handleCreateAndAdd} autoFocus />
              <PrivacySelect isPublic={newPlaylistPublic} onChange={setNewPlaylistPublic} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="button" className="rounded-full" onClick={handleCreateAndAdd} disabled={!newPlaylistName.trim()}>Create</Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-12 w-full items-center gap-4 rounded-b-xl px-6 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-6 w-6" /> Create new playlist
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
