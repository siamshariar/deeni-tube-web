// components/playlist-menu.tsx
// A playlist's three-dot menu, the same on the playlists page, on channel and scholar pages and in the playlist itself:
// Play all · Share · Edit · Delete. Share only for public ones; Edit and Delete only for the visitor's own (not Watch
// later and Liked videos, and not a channel's). With nothing left to offer there is no button.
"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Play, Trash2 } from "lucide-react";
import { ActionMenu, type MenuAction } from "@/components/action-menu";
import { MoreButton } from "@/components/more-button";
import { ShareIcon } from "@/components/icons/action-icons";
import { PlaylistNameField, PrivacySelect } from "@/components/playlist-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isSystemPlaylist, usePlaylists } from "@/hooks/usePlaylists";
import { openShare } from "@/lib/dialogs";
import { notify } from "@/lib/notify";
import type { PlaylistItem } from "@/lib/playlist-data";

interface PlaylistMenuProps {
  playlist: PlaylistItem;
  /** A channel's playlist: not the visitor's to change */
  readOnly?: boolean;
  /** Where Play all goes; none inside the playlist itself */
  playHref?: string;
  onPlay?: () => void;
  onDeleted?: () => void;
  trigger?: ReactElement;
}

export function PlaylistMenu({ playlist, readOnly = false, playHref, onPlay, onDeleted, trigger }: PlaylistMenuProps) {
  const router = useRouter();
  const { deletePlaylist } = usePlaylists();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const own = !readOnly && !isSystemPlaylist(playlist.id);

  const actions: MenuAction[] = [];
  if (playHref)
    actions.push({
      id: "play",
      label: "Play all",
      icon: Play,
      onSelect: () => {
        onPlay?.();
        router.push(playHref);
      },
    });
  if (playlist.isPublic) actions.push({ id: "share", label: "Share", icon: ShareIcon, opens: true, onSelect: () => openShare(`/playlists/${playlist.slug}/${playlist.id}`, playlist.name) });
  if (own) {
    actions.push({ id: "edit", label: "Edit playlist", icon: Pencil, opens: true, divider: actions.length > 0, onSelect: () => setEditing(true) });
    actions.push({ id: "delete", label: "Delete playlist", icon: Trash2, opens: true, danger: true, onSelect: () => setDeleting(true) });
  }

  const remove = () => {
    setDeleting(false);
    notify("Playlist deleted", deletePlaylist(playlist.id));
    onDeleted?.();
  };

  return (
    <>
      <ActionMenu actions={actions} title="Playlist actions" trigger={trigger ?? <MoreButton aria-label={`More actions for ${playlist.name}`} />} />
      {editing && <PlaylistDialog playlist={playlist} onClose={() => setEditing(false)} />}
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete playlist</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{playlist.name}</span>? Its videos stay on Deeni.tube.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** New playlist, or an existing one's name and privacy. */
export function PlaylistDialog({ playlist, onClose }: { playlist?: PlaylistItem; onClose: () => void }) {
  const { createPlaylist, updatePlaylist } = usePlaylists();
  const [name, setName] = useState(playlist?.name ?? "");
  const [isPublic, setIsPublic] = useState(playlist?.isPublic ?? false);
  const save = () => {
    if (!name.trim()) return; // the button is disabled until there's a name
    if (playlist) updatePlaylist(playlist.id, { name: name.trim(), isPublic });
    else createPlaylist(name.trim(), isPublic);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{playlist ? "Edit playlist" : "New playlist"}</DialogTitle>
          <DialogDescription>{playlist ? "Change its name and who can see it." : "Give it a name and choose who can see it."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <PlaylistNameField value={name} onChange={setName} onEnter={save} placeholder="My playlist" autoFocus />
          <PrivacySelect isPublic={isPublic} onChange={setIsPublic} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()}>{playlist ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
