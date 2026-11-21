// app/playlists/page.tsx
"use client";

import { playPlaylistFromTap } from "@/lib/play-playlist";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ChevronDown,
  ListVideo,
  Globe,
  Lock,
  Plus,
  Edit,
  Trash2,
  Share,
  Play,
} from "lucide-react";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareModal } from "@/components/share-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { PlaylistItem } from "@/lib/playlist-data";
import { usePlaylists, playlistAgeMs, isSystemPlaylist } from "@/hooks/usePlaylists";
import { useHydrated } from "@/lib/local-store";
import { videoData } from "@/lib/video-data";
import Image from "next/image";

import { imagePriorityProps } from "@/lib/image-priority";
import { youtubeThumb } from "@/lib/media-lookup";
import { PlaylistNameField, PrivacySelect } from "@/components/playlist-fields";
export default function PlaylistsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "asc" | "desc">("recent");
  const hydrated = useHydrated();
  const { playlists, createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists();
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistItem | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState<PlaylistItem | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPublic, setEditPublic] = useState(true);
  const resetCreateDialog = () => {
    setNewPlaylistName("");
    setNewPlaylistPublic(false);
  };

  const getPlaylistThumbs = (playlist: PlaylistItem): string[] => {
    return playlist.videoIds
      .slice(0, 4)
      .map((id) => {
        const v = videoData.find((v) => v.id === id);
        return v ? v.videoId : null;
      })
      .filter(Boolean) as string[];
  };

  const filteredPlaylists = useMemo(() => {
    const list = playlists.filter((pl) =>
      pl.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortOrder === "recent") {
      list.sort((a, b) => playlistAgeMs(a) - playlistAgeMs(b));
    } else if (sortOrder === "asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }
    return list;
  }, [playlists, searchQuery, sortOrder]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }
    createPlaylist(newPlaylistName.trim(), newPlaylistPublic);
    resetCreateDialog();
    setShowCreateDialog(false);
    toast.success("Playlist created!");
  };

  const handleEditPlaylist = () => {
    if (!editName.trim() || !editingPlaylist) return;
    updatePlaylist(editingPlaylist.id, { name: editName.trim(), isPublic: editPublic });
    setShowEditDialog(false);
    setEditingPlaylist(null);
    toast.success("Playlist updated!");
  };

  const handleDeletePlaylist = () => {
    if (!deletingPlaylist) return;
    deletePlaylist(deletingPlaylist.id);
    setShowDeleteDialog(false);
    setDeletingPlaylist(null);
    toast.success("Playlist deleted!");
  };

  const openEditDialog = (playlist: PlaylistItem) => {
    setEditingPlaylist(playlist);
    setEditName(playlist.name);
    setEditPublic(playlist.isPublic);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (playlist: PlaylistItem) => {
    setDeletingPlaylist(playlist);
    setShowDeleteDialog(true);
  };

  const handleShare = (playlist: PlaylistItem) => {
    const url = `${window.location.origin}/playlists/${playlist.slug}/${playlist.id}`;
    setShareUrl(url);
    setShowShareModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-3 md:px-6 py-4 md:py-6 mt-14 md:mt-16">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h1 className="text-xl font-bold md:text-2xl">Playlists</h1>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search playlists"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search playlists"
                className="h-10 rounded-full border-transparent bg-muted pl-10 pr-10 text-sm transition-colors focus-visible:border-input focus-visible:bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <Button
              className="h-10 flex-shrink-0 gap-2 rounded-full px-4 font-medium"
              onClick={() => { resetCreateDialog(); setShowCreateDialog(true); }}
            >
              <Plus className="h-5 w-5" />
              <span>New playlist</span>
            </Button>
          </div>
        </div>

        {/* Sort chip */}
        <div className="mb-6 flex gap-3 overflow-x-auto scrollbar-none">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-muted px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                {sortOrder === "recent" && "Recently updated"}
                {sortOrder === "asc" && "A-Z"}
                {sortOrder === "desc" && "Z-A"}
                <ChevronDown className="h-4 w-4 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl py-2">
              <DropdownMenuItem className="cursor-pointer py-2 text-sm" onClick={() => setSortOrder("recent")}>Recently updated</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2 text-sm" onClick={() => setSortOrder("asc")}>A-Z</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2 text-sm" onClick={() => setSortOrder("desc")}>Z-A</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Playlist grid */}
        {!hydrated ? null : filteredPlaylists.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ListVideo className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mb-1 text-xl font-bold">
              {searchQuery ? "No playlists found" : "No playlists yet"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? "Try different search terms"
                : "Create your first playlist to organise your lectures"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => { resetCreateDialog(); setShowCreateDialog(true); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> New playlist
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPlaylists.map((playlist, cardIndex) => {
              const videoCount = playlist.videoIds?.length ?? 0;
              // Video ids; tiles in the 2×2 mosaic are ~150px wide, a single cover is the full card
              const thumbs = getPlaylistThumbs(playlist);
              return (
                <div
                  key={playlist.id}
                  role="link"
                  tabIndex={0}
                  aria-label={playlist.name}
                  className="group flex cursor-pointer gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-col sm:gap-0"
                  onClick={() => {
                    playPlaylistFromTap(playlist.videoIds);
                    router.push(`/playlists/${playlist.slug}/${playlist.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      playPlaylistFromTap(playlist.videoIds);
                      router.push(`/playlists/${playlist.slug}/${playlist.id}`);
                    }
                  }}
                >
                  {/* Thumbnail with YouTube's "stacked playlist" edge; a list row on phones, a card from sm up */}
                  <div className="relative w-40 flex-shrink-0 pt-1.5 sm:w-full sm:pt-2">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-2 top-0 h-1 rounded-t-md bg-muted-foreground/40 sm:inset-x-3 sm:h-1.5 sm:rounded-t-lg"
                      style={playlist.thumbnailColor ? { backgroundColor: playlist.thumbnailColor, opacity: 0.55 } : undefined}
                    />
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted sm:rounded-xl">
                    {thumbs.length >= 2 ? (
                      <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="relative bg-muted overflow-hidden">
                            {thumbs[i] ? (
                              <Image src={youtubeThumb(thumbs[i], "small")} alt="" fill {...imagePriorityProps(cardIndex === 0 && i === 0 ? "lcp" : undefined)} className="object-cover" />
                            ) : (
                              <div className="absolute inset-0" style={{ backgroundColor: playlist.thumbnailColor, opacity: 0.4 }} />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : thumbs.length === 1 ? (
                      <Image src={youtubeThumb(thumbs[0])} alt={playlist.name} fill {...imagePriorityProps(cardIndex === 0 ? "lcp" : undefined)} className="object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0 opacity-30" style={{ backgroundColor: playlist.thumbnailColor }} />
                        <div className="absolute left-4 right-4 top-4 bottom-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: playlist.thumbnailColor }}>
                          <ListVideo className="h-10 w-10 text-white/60" />
                        </div>
                      </>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-black/80 px-1.5 py-px text-xs font-medium leading-[18px] text-white">
                      <ListVideo className="h-4 w-4" />
                      {videoCount}
                      <span className="hidden sm:inline">video{videoCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  </div>

                  {/* Metadata */}
                  <div className="min-w-0 flex-1 pt-1.5 sm:pt-3">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 break-words text-sm font-medium leading-5 md:text-base md:leading-[22px]">
                          {playlist.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground md:text-sm">
                          {playlist.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          {playlist.isPublic ? "Public" : "Private"} · Playlist
                        </p>
                        <p className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground md:text-sm">
                          View full playlist
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <MoreButton aria-label={`More actions for ${playlist.name}`} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="-mr-2 -mt-2" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl py-2">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/playlists/${playlist.slug}/${playlist.id}`); }}>
                            <Play className="h-5 w-5" /> Play all
                          </DropdownMenuItem>
                          {!isSystemPlaylist(playlist.id) && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(playlist); }}>
                              <Edit className="h-5 w-5" /> Edit
                            </DropdownMenuItem>
                          )}
                          {playlist.isPublic && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(playlist); }}>
                              <Share className="h-5 w-5" /> Share
                            </DropdownMenuItem>
                          )}
                          {!isSystemPlaylist(playlist.id) && (
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={(e) => { e.stopPropagation(); openDeleteDialog(playlist); }}
                            >
                              <Trash2 className="h-5 w-5" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Playlist Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetCreateDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new playlist</DialogTitle>
            <DialogDescription>
              Give your playlist a name and choose its privacy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <PlaylistNameField value={newPlaylistName} onChange={setNewPlaylistName} onEnter={handleCreatePlaylist} placeholder="My playlist" autoFocus />
            <PrivacySelect isPublic={newPlaylistPublic} onChange={setNewPlaylistPublic} />
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => { setShowCreateDialog(false); resetCreateDialog(); }}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full"
              onClick={handleCreatePlaylist}
              disabled={!newPlaylistName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Playlist Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit playlist</DialogTitle>
            <DialogDescription>Update the name and privacy settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <PlaylistNameField value={editName} onChange={setEditName} onEnter={handleEditPlaylist} placeholder="Playlist name" autoFocus />
            <PrivacySelect isPublic={editPublic} onChange={setEditPublic} />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button className="rounded-full" onClick={handleEditPlaylist} disabled={!editName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Playlist Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete playlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingPlaylist?.name}</span>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={handleDeletePlaylist}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} videoUrl={shareUrl} />
    </div>
  );
}
