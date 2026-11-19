"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Globe, Lock, Plus } from "lucide-react";
import { usePlaylists } from "@/hooks/usePlaylists";
import { canonicalVideoId } from "@/lib/media-lookup";
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
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);
  // Start with an empty form each time the dialog opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setNewPlaylistName(""); setNewPlaylistPublic(false); }
  }
  const setOpen = (o: boolean) => {
    if (!o) { setNewPlaylistName(""); setNewPlaylistPublic(false); }
    (onOpenChange ?? setInternalOpen)(o);
  };
  const { playlists, addVideoToPlaylist, createPlaylist } = usePlaylists();

  const videoKey = canonicalVideoId(video.id);

  const handleAddToExisting = (playlistId: string, name: string) => {
    if (!addVideoToPlaylist(playlistId, video)) {
      toast(`Already in "${name}"`);
      return;
    }
    toast.success(`Saved to "${name}"`);
    onAdded?.();
    setOpen(false);
  };

  const handleCreateAndAdd = () => {
    if (!newPlaylistName.trim()) return;
    const name = newPlaylistName.trim();
    const newId = createPlaylist(name, newPlaylistPublic);
    addVideoToPlaylist(newId, video);
    toast.success(`Created "${name}" and saved the video`);
    setNewPlaylistName("");
    setNewPlaylistPublic(false);
    onAdded?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {playlists.map(pl => {
              const added = pl.videoIds.includes(videoKey);
              return (
                <button
                  type="button"
                  key={pl.id}
                  onClick={() => handleAddToExisting(pl.id, pl.name)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {pl.isPublic ? <Globe className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
                    <span className="truncate">{pl.name}</span>
                  </span>
                  {added ? (
                    <span className="flex items-center gap-1 text-xs text-primary flex-shrink-0"><Check className="h-3.5 w-3.5" /> Saved</span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex-shrink-0">{pl.videoIds.length} videos</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">Create new playlist</p>
            <Input
              placeholder="Playlist name"
              aria-label="New playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateAndAdd(); }}
              className="mb-2"
            />
            <div className="flex items-center justify-between">
              <select
                value={newPlaylistPublic ? "public" : "private"}
                onChange={e => setNewPlaylistPublic(e.target.value === "public")}
                aria-label="Visibility"
                className="h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
              <Button size="sm" onClick={handleCreateAndAdd} disabled={!newPlaylistName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Create & add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}