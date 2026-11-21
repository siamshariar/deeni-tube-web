// app/playlists/[slug]/[id]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Shuffle,
  Search,
  X,
  Globe,
  Lock,
  Share,
  Trash2,
  Edit,
  ChevronDown,
  GripVertical,
  Repeat,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Send,
  Clock,
  UserX,
  Flag,
  MoreHorizontal,
  EyeOff,
  ListPlus,
  Check,
} from "lucide-react";
import { MoreButton } from "@/components/more-button";
import Image from "next/image";
import Link from "next/link";
import { WatchedBar } from "@/components/watched-bar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareModal } from "@/components/share-modal";
import { DescriptionText } from "@/components/description-text";
import { YouTubePlayer } from "@/components/youtube-player";
import { WATCH_COLUMNS, WATCH_PRIMARY, WATCH_SECONDARY } from "@/components/watch-layout";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { ReportDialog } from "@/components/report-dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { VideoItem } from "@/lib/video-data";
import { extendedPlaylists } from "@/lib/playlist-data";
import { usePlaylists, isSystemPlaylist } from "@/hooks/usePlaylists";
import { useHydrated } from "@/lib/local-store";
import { findVideo, youtubeThumb } from "@/lib/media-lookup";
import { recordWatch } from "@/hooks/useWatchHistory";
import { historyEntryForVideo } from "@/lib/history-entry";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWatchLater } from "@/hooks/useWatchLater";
import { getChannelHref } from "@/lib/channel-data";

// YouTube-style action pill (36px tall, 24px icon) and round icon button
const PILL =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-muted pl-3 pr-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:h-6 [&_svg]:w-6";
const ROUND =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:h-6 [&_svg]:w-6";
const MENU_ITEM = "flex items-center gap-4 px-4 py-2 text-sm cursor-pointer";
const DRAWER_ITEM = "flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer";

import type { CommentReply } from "@/lib/types";
import { videoPath } from "@/lib/video-url";
// ─── Mock comments ─────────────────────────────────
const mockCommentsWithReplies = [
  {
    id: "c1",
    user: "Ahmad Khan",
    avatar: "/placeholder.svg?height=32&width=32",
    timeAgo: "2 days ago",
    content: "MashaAllah, very beneficial lecture! May Allah bless you.",
    likes: 245,
    dislikes: 12,
    replies: [
      {
        id: "r1",
        user: "Daily Dawah",
        avatar: "/placeholder.svg?height=32&width=32",
        timeAgo: "1 day ago",
        content: "JazakAllah khair for your kind words!",
        likes: 89,
        dislikes: 3,
        isChannel: true,
      },
      {
        id: "r2",
        user: "Mohammed Ali",
        avatar: "/placeholder.svg?height=32&width=32",
        timeAgo: "12 hours ago",
        content: "Couldn't agree more. May Allah accept our efforts.",
        likes: 34,
        dislikes: 1,
      },
    ],
  },
  {
    id: "c2",
    user: "Fatima Hassan",
    avatar: "/placeholder.svg?height=32&width=32",
    timeAgo: "1 week ago",
    content: "Beautiful reminder. SubhanAllah! This really touched my heart.",
    likes: 567,
    dislikes: 23,
    replies: [],
  },
  {
    id: "c3",
    user: "Omar Farooq",
    avatar: "/placeholder.svg?height=32&width=32",
    timeAgo: "3 days ago",
    content: "This changed my perspective. JazakAllah khair!",
    likes: 189,
    dislikes: 8,
    replies: [
      {
        id: "r3",
        user: "Zainab Mohammed",
        avatar: "/placeholder.svg?height=32&width=32",
        timeAgo: "2 days ago",
        content: "Same here brother. SubhanAllah!",
        likes: 45,
        dislikes: 2,
      },
    ],
  },
];

// ─── Reply component (recursive) ─────────────────────
function ReplyItem({
  reply,
  onLike,
  onDislike,
  onReply,
  isLiked,
  isDisliked,
  depth = 0,
}: {
  reply: CommentReply;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onReply: (id: string, text: string) => void;
  isLiked: boolean;
  isDisliked: boolean;
  depth?: number;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(reply.id, replyText.trim());
    setReplyText("");
    setShowReplyInput(false);
  };

  const displayName = reply.isChannel ? (
    <span className="flex items-center gap-1">
      {reply.user}
      <span className="text-[10px] bg-foreground/10 px-1.5 py-0.5 rounded-full font-medium text-muted-foreground">
        Creator
      </span>
    </span>
  ) : (
    reply.user
  );

  return (
    <div className={`mt-2 ${depth > 0 ? "ml-8" : ""}`}>
      <div className="flex gap-2.5">
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={reply.avatar} />
          <AvatarFallback className="text-[10px]">
            {reply.user.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">{displayName}</span>
            <span className="text-[10px] text-muted-foreground">
              {reply.timeAgo}
            </span>
          </div>
          <p className="text-sm mt-0.5">{reply.content}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => onLike(reply.id)}
              className={`flex items-center gap-1.5 hover:bg-muted rounded-full px-2.5 py-1 transition-colors ${
                isLiked ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <ThumbsUp
                className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
              />
              <span className="text-xs">{reply.likes}</span>
            </button>
            <button aria-label="Dislike"
              onClick={() => onDislike(reply.id)}
              className={`hover:bg-muted rounded-full p-1 transition-colors ${
                isDisliked ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              <ThumbsDown
                className={`h-4 w-4 ${isDisliked ? "fill-current" : ""}`}
              />
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-xs text-muted-foreground hover:bg-muted rounded-full px-2.5 py-1 transition-colors"
            >
              Reply
            </button>
          </div>
          {showReplyInput && (
            <div className="mt-2 flex gap-2">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className="text-[10px]">Y</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReplySubmit()}
                  className="flex-1 bg-transparent border-b border-border pb-1 text-xs focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
                  autoFocus
                />
                <button aria-label="Post comment"
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim()}
                  className="text-primary hover:text-primary/80 disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Cancel reply"
                  onClick={() => setShowReplyInput(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          {reply.replies &&
            reply.replies.map((nestedReply: CommentReply) => (
              <ReplyItem
                key={nestedReply.id}
                reply={nestedReply}
                onLike={onLike}
                onDislike={onDislike}
                onReply={onReply}
                isLiked={false}
                isDisliked={false}
                depth={depth + 1}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton for playlist video card ───────────────
function VideoSkeleton() {
  return (
    <div className="flex gap-3 py-2">
      <Skeleton className="w-[120px] h-[68px] rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}


// Reply box shown under a top-level comment
function InlineReplyBox({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const submit = () => {
    if (text.trim()) onSubmit(text.trim());
  };
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text"
        autoFocus
        aria-label="Write a reply"
        placeholder="Add a reply..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 bg-transparent border-b border-border pb-1 text-sm focus:outline-none placeholder:text-muted-foreground"
      />
      <button type="button" onClick={onCancel} className="text-xs font-medium hover:bg-muted rounded-full px-3 py-1.5">
        Cancel
      </button>
      <button
        type="button"
        onClick={submit}
        disabled={!text.trim()}
        className="text-xs font-medium bg-foreground text-background rounded-full px-3 py-1.5 disabled:opacity-50"
      >
        Reply
      </button>
    </div>
  );
}

export default function PlaylistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const playlistId = params.id as string;
  // When opened from a channel page, the playlist is read-only (channel-owned)
  const isChannelPlaylist = searchParams.get("source") === "channel";

  const hydrated = useHydrated();
  const { getPlaylist, removeVideoFromPlaylist, reorderPlaylist, deletePlaylist } = usePlaylists();
  // Channel playlists are read-only and always available, even if removed from the user's library
  const playlist = hydrated
    ? getPlaylist(playlistId) ?? (isChannelPlaylist ? extendedPlaylists.find((p) => p.id === playlistId) : undefined) ?? null
    : null;
  const savedVideos = useMemo(
    () => (playlist?.videoIds ?? []).map((id) => findVideo(id)).filter((v): v is VideoItem => v !== undefined),
    [playlist]
  );
  // Live order while dragging; persisted on drop
  const [dragOrder, setDragOrder] = useState<VideoItem[] | null>(null);
  const videos = dragOrder ?? savedVideos;
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const isLoading = !hydrated;
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVideoShareModal, setShowVideoShareModal] = useState(false);
  const { addToWatchLater, removeFromWatchLater, isInWatchLater } = useWatchLater();
  const toggleWatchLater = (v: VideoItem) => {
    if (isInWatchLater(v.id)) {
      removeFromWatchLater(v.id);
      toast.success("Removed from Watch later");
    } else {
      addToWatchLater({ id: v.id, title: v.title, channel: v.channel, channelAvatar: v.channelAvatar || "", thumbnail: youtubeThumb(v.videoId), views: v.views, timeAgo: v.timeAgo, duration: v.duration, addedAt: Date.now() });
      toast.success("Saved to Watch later");
    }
  };
  const shareUrl = playlist && typeof window !== "undefined" ? `${window.location.origin}/playlists/${playlist.slug}/${playlist.id}` : "";
  const [collapsed, setCollapsed] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);   // ✅ added

  const [dragItem, setDragItem] = useState<number | null>(null);

  const [comments, setComments] = useState(mockCommentsWithReplies);
  const [commentText, setCommentText] = useState("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [dislikedComments, setDislikedComments] = useState<Set<string>>(new Set());
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const [autoPlay, setAutoPlay] = useState(true);
  const filteredVideos = useMemo(() => {
    if (!searchQuery) return videos;
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.channel.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [videos, searchQuery]);

  const currentVideo = videos.find((v) => v.id === currentVideoId) ?? videos[0];
  const currentIndex = currentVideo ? videos.findIndex((v) => v.id === currentVideo.id) : -1;
  const nextVideo = currentIndex >= 0 ? videos[currentIndex + 1] : undefined;
  // The player moves on to the next video at the end when Autoplay (the switch in the playlist panel, also in
  // the player) is on; otherwise it shows its end screen with Replay and "Up next"
  const player = currentVideo ? (
    <YouTubePlayer
      key={currentVideo.id}
      videoId={currentVideo.videoId}
      title={currentVideo.title}
      autoplay={autoPlay}
      onAutoplayChange={setAutoPlay}
      onNext={nextVideo ? () => setCurrentVideoId(nextVideo.id) : undefined}
      upNext={nextVideo ? { title: nextVideo.title, channel: nextVideo.channel, videoId: nextVideo.videoId } : null}
    />
  ) : null;

  useEffect(() => {
    if (currentVideo) recordWatch(historyEntryForVideo(currentVideo));
  }, [currentVideo]);
  const canEdit = !isChannelPlaylist && !!playlist;
  // Reordering is only meaningful on the full, unfiltered list
  const canReorder = canEdit && !searchQuery;

  const handleSelectVideo = (video: VideoItem) => {
    setCurrentVideoId(video.id);
  };

  const handleRemoveVideo = (video: VideoItem) => {
    if (!playlist) return;
    if (video.id === currentVideo?.id) {
      const i = videos.findIndex((v) => v.id === video.id);
      setCurrentVideoId((videos[i + 1] ?? videos[i - 1])?.id ?? null);
    }
    removeVideoFromPlaylist(playlist.id, video.id);
    toast.success(`Removed from "${playlist.name}"`);
  };

  const handleDeletePlaylist = () => {
    if (!playlist) return;
    deletePlaylist(playlist.id);
    toast.success("Playlist deleted");
    router.push("/playlists");
  };

  const handleDragStart = (index: number) => {
    setDragOrder(savedVideos);
    setDragItem(index);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragItem === null || dragItem === index) return;
    const items = [...videos];
    const draggedItem = items[dragItem];
    items.splice(dragItem, 1);
    items.splice(index, 0, draggedItem);
    setDragOrder(items);
    setDragItem(index);
  };
  const handleDragEnd = () => {
    if (dragOrder && playlist) reorderPlaylist(playlist.id, dragOrder.map((v) => v.id));
    setDragOrder(null);
    setDragItem(null);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: `c${Date.now()}`,
      user: "You",
      avatar: "/placeholder.svg?height=32&width=32",
      timeAgo: "Just now",
      content: commentText.trim(),
      likes: 0,
      dislikes: 0,
      replies: [],
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
    toast.success("Comment added (demo)");
  };

  const handleLikeComment = (commentId: string) => {
    setLikedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
        setDislikedComments((d) => {
          const dSet = new Set(d);
          dSet.delete(commentId);
          return dSet;
        });
      }
      return newSet;
    });
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const isLikedNow = !likedComments.has(commentId);
          return { ...c, likes: isLikedNow ? c.likes + 1 : c.likes - 1 };
        }
        if (c.replies) {
          const updatedReplies = c.replies.map((r) => {
            if (r.id === commentId) {
              const isLikedNow = !likedComments.has(commentId);
              return { ...r, likes: isLikedNow ? r.likes + 1 : r.likes - 1 };
            }
            return r;
          });
          return { ...c, replies: updatedReplies };
        }
        return c;
      })
    );
  };

  const handleDislikeComment = (commentId: string) => {
    setDislikedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
        setLikedComments((l) => {
          const lSet = new Set(l);
          lSet.delete(commentId);
          return lSet;
        });
      }
      return newSet;
    });
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const isDislikedNow = !dislikedComments.has(commentId);
          return { ...c, dislikes: isDislikedNow ? c.dislikes + 1 : c.dislikes - 1 };
        }
        if (c.replies) {
          const updatedReplies = c.replies.map((r) => {
            if (r.id === commentId) {
              const isDislikedNow = !dislikedComments.has(commentId);
              return { ...r, dislikes: isDislikedNow ? r.dislikes + 1 : r.dislikes - 1 };
            }
            return r;
          });
          return { ...c, replies: updatedReplies };
        }
        return c;
      })
    );
  };

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  // Adds a reply to the thread containing `commentId` (a top-level comment or one of its replies)
  const handleReply = (commentId: string, text: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId || c.replies?.some((r) => r.id === commentId)
          ? {
              ...c,
              replies: [
                ...(c.replies ?? []),
                { id: `r${Date.now()}`, user: "You", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "Just now", content: text, likes: 0, dislikes: 0, isChannel: false },
              ],
            }
          : c
      )
    );
    setReplyingTo(null);
    toast.success("Reply added");
  };

  const handleShare = () => {
    if (playlist?.isPublic) setShowShareModal(true);
  };

  const toggleCollapse = () => setCollapsed(!collapsed);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        {/* Mobile: sticky back bar */}
        <div className="md:hidden sticky top-14 z-10 bg-background/95 border-b h-11 flex items-center px-4 gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>

        {/* Mobile: full-width video */}
        <div className="md:hidden w-full bg-black">
          <Skeleton className="w-full aspect-video" />
        </div>

        <div className="px-3 pt-3 md:px-6 md:pt-4 pb-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: video + info */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Desktop video */}
              <Skeleton className="hidden md:block w-full aspect-video rounded-xl" />
              {/* Title + channel row */}
              <div className="flex gap-2 items-start">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            </div>

            {/* Right: playlist panel */}
            <div className="lg:w-[402px] flex-shrink-0 self-start rounded-xl border bg-card overflow-hidden">
              {/* Panel header */}
              <div className="p-4 border-b space-y-2">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
              {/* Search */}
              <div className="p-3 border-b">
                <Skeleton className="h-9 w-full rounded-full" />
              </div>
              {/* Video rows */}
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <VideoSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold">Playlist not found</h2>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-md mx-auto text-center px-4 py-20">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">{playlist.name}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            No videos in this playlist yet. Use &quot;Save to playlist&quot; on any video to add it here.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => router.push("/playlists")}>
              All playlists
            </Button>
            <Button className="rounded-full" onClick={() => router.push("/")}>
              Browse videos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      {/* Mobile back button + title */}
      {isMobile && (
        <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 w-full min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="text-[15px] font-medium line-clamp-1 text-left">
              {currentVideo?.title || playlist.name}
            </span>
          </button>
        </div>
      )}

      {/* Mobile: full-width video (edge-to-edge) */}
      {isMobile && (
        <div className="relative w-full aspect-video bg-black">{player}</div>
      )}

      <div className="pb-6">
        <div className="px-3 md:pt-6 md:px-6">
          {/* YouTube's watch layout (see components/watch-layout.ts) */}
          <div className={WATCH_COLUMNS}>
            <div className={WATCH_PRIMARY}>
              {/* Desktop video player: always exactly 16:9, so no black bars at the sides */}
              {!isMobile && (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">{player}</div>
              )}

              {currentVideo && (
                <div className="mt-3">
                  <h1 className="text-lg md:text-xl font-semibold md:font-bold leading-6 md:leading-7 line-clamp-2 md:line-clamp-none [overflow-wrap:anywhere]">
                    {currentVideo.title}
                  </h1>

                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {/* Channel */}
                    <Link href={getChannelHref(currentVideo.channelId)} className="flex min-w-0 items-center gap-3 self-start md:self-auto">
                      <Avatar className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0">
                        <AvatarImage src={currentVideo.channelAvatar} alt="" />
                        <AvatarFallback className="font-medium">{currentVideo.channel?.charAt(0) || "C"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] md:text-base font-medium leading-5">{currentVideo.channel}</p>
                        <p className="text-xs leading-[18px] text-muted-foreground">780K subscribers</p>
                      </div>
                    </Link>

                    {/* Actions — a scrollable row of pills on phones */}
                    <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 scrollbar-none md:mx-0 md:overflow-visible md:px-0">
                      <button type="button" className={PILL} onClick={() => setShowVideoShareModal(true)}>
                        <Share /> Share
                      </button>
                      <button
                        type="button"
                        className={PILL}
                        aria-pressed={isInWatchLater(currentVideo.id)}
                        onClick={() => toggleWatchLater(currentVideo)}
                      >
                        {isInWatchLater(currentVideo.id) ? <><Check /> Saved</> : <><Clock /> Watch later</>}
                      </button>
                      <button type="button" className={PILL} onClick={() => setShowPlaylistDialog(true)}>
                        <ListPlus /> Save
                      </button>
                      {isMobile ? (
                        <Drawer open={menuDrawerOpen} onOpenChange={setMenuDrawerOpen}>
                          <DrawerTrigger asChild>
                            <button type="button" aria-label="More actions" className={ROUND}>
                              <MoreHorizontal />
                            </button>
                          </DrawerTrigger>
                          <DrawerContent accessibleTitle="Video actions" className="px-0 max-h-[70vh]">
                            <div className="mt-2 pb-6">
                              <div className={DRAWER_ITEM} onClick={() => { setMenuDrawerOpen(false); toast("Channel removed from feed"); }}><UserX className="h-6 w-6" /> Don&apos;t recommend channel</div>
                              <div className={DRAWER_ITEM} onClick={() => { setMenuDrawerOpen(false); toast("Video removed"); setTimeout(() => router.back(), 1000); }}><EyeOff className="h-6 w-6" /> Not interested</div>
                              <div className={DRAWER_ITEM} onClick={() => { setMenuDrawerOpen(false); setTimeout(() => setShowReportDialog(true), 150); }}><Flag className="h-6 w-6" /> Report</div>
                            </div>
                          </DrawerContent>
                        </Drawer>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="More actions" className={ROUND}>
                              <MoreHorizontal />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 rounded-xl py-2">
                            <DropdownMenuItem className={MENU_ITEM} onSelect={() => toast("Channel removed from feed")}><UserX className="h-5 w-5" /> Don&apos;t recommend channel</DropdownMenuItem>
                            <DropdownMenuItem className={MENU_ITEM} onSelect={() => { toast("Video removed"); setTimeout(() => router.back(), 1000); }}><EyeOff className="h-5 w-5" /> Not interested</DropdownMenuItem>
                            <DropdownMenuItem className={MENU_ITEM} onSelect={(e) => { e.preventDefault(); setShowReportDialog(true); }}><Flag className="h-5 w-5" /> Report</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Description – modal on mobile, inline on desktop */}
                  <div className="mt-3 rounded-xl bg-muted p-3 text-sm leading-5">
                    <p className="font-medium">
                      {currentVideo.views}
                      <span className="ml-2">{currentVideo.timeAgo}</span>
                    </p>
                    {isMobile ? (
                      <>
                        <p className="mt-1 line-clamp-2 [overflow-wrap:anywhere]">{currentVideo.description}</p>
                        <button
                          type="button"
                          onClick={() => setDescriptionModalOpen(true)}
                          className="mt-1 font-medium"
                        >
                          ...more
                        </button>
                      </>
                    ) : (
                      <DescriptionText text={currentVideo.description} className="mt-1" />
                    )}
                  </div>

                  {/* Description for phones: a sheet from the bottom, as on YouTube */}
                  <Drawer open={descriptionModalOpen} onOpenChange={setDescriptionModalOpen}>
                    <DrawerContent accessibleTitle={null} className="max-h-[85dvh] px-0">
                      <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-1">
                        <DrawerTitle className="text-lg font-bold">Description</DrawerTitle>
                        <button type="button" onClick={() => setDescriptionModalOpen(false)} aria-label="Close" className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent">
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-3">
                        <h3 className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">{currentVideo.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{currentVideo.views} · {currentVideo.timeAgo}</p>
                        <DescriptionText text={currentVideo.description} className="mt-3 text-sm leading-relaxed" />
                      </div>
                    </DrawerContent>
                  </Drawer>

                  {/* Comments section — commented out; remove the false && wrapper to re-enable */}
                  {false && (<div className="mt-4">
                    {!isMobile ? (
                      <div>
                        <div className="flex items-center gap-6 mb-4">
                          <MessageCircle className="h-5 w-5" />
                          <span className="font-semibold text-base">{comments.length} Comments</span>
                        </div>
                        <div className="flex gap-3 mb-6">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>Y</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                              className="w-full bg-transparent border-b border-border pb-1.5 text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
                            />
                            {commentText && (
                              <div className="flex items-center gap-2 mt-3 justify-end">
                                <button onClick={() => setCommentText("")} className="text-sm font-medium hover:bg-muted rounded-full px-4 py-2">Cancel</button>
                                <button onClick={handleAddComment} className="text-sm font-medium bg-foreground text-background rounded-full px-4 py-2 hover:bg-foreground/90 disabled:opacity-50" disabled={!commentText.trim()}>Comment</button>
                              </div>
                            )}
                          </div>
                        </div>
                        {comments.map((comment) => (
                          <div key={comment.id} className="py-3 border-b last:border-0">
                            <div className="flex gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.avatar} />
                                <AvatarFallback>{comment.user.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{comment.user}</span>
                                  <span className="text-xs text-muted-foreground">{comment.timeAgo}</span>
                                </div>
                                <p className="text-sm mt-0.5">{comment.content}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <button onClick={() => handleLikeComment(comment.id)} className={`flex items-center gap-1.5 hover:bg-muted rounded-full px-2.5 py-1 transition-colors ${likedComments.has(comment.id) ? "text-primary" : "text-muted-foreground"}`}>
                                    <ThumbsUp className={`h-4 w-4 ${likedComments.has(comment.id) ? "fill-current" : ""}`} />
                                    <span className="text-xs">{comment.likes}</span>
                                  </button>
                                  <button aria-label="Dislike" onClick={() => handleDislikeComment(comment.id)} className={`hover:bg-muted rounded-full p-1 transition-colors ${dislikedComments.has(comment.id) ? "text-destructive" : "text-muted-foreground"}`}>
                                    <ThumbsDown className={`h-4 w-4 ${dislikedComments.has(comment.id) ? "fill-current" : ""}`} />
                                  </button>
                                  <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-xs text-muted-foreground hover:bg-muted rounded-full px-2.5 py-1 transition-colors">Reply</button>
                                </div>
                                {replyingTo === comment.id && (
                                  <InlineReplyBox onSubmit={(text) => handleReply(comment.id, text)} onCancel={() => setReplyingTo(null)} />
                                )}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div className="mt-2">
                                    {comment.replies.map((reply: CommentReply) => (
                                      <ReplyItem
                                        key={reply.id}
                                        reply={reply}
                                        onLike={handleLikeComment}
                                        onDislike={handleDislikeComment}
                                        onReply={handleReply}
                                        isLiked={likedComments.has(reply.id)}
                                        isDisliked={dislikedComments.has(reply.id)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Drawer open={commentsDrawerOpen} onOpenChange={setCommentsDrawerOpen}>
                        <DrawerTrigger asChild>
                          <Button variant="outline" className="w-full rounded-full flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" /> {comments.length} Comments
                        </Button>
                        </DrawerTrigger>
                        <DrawerContent accessibleTitle={null} className="h-[80vh]">
                          <DrawerHeader>
                            <DrawerTitle className="text-lg">Comments</DrawerTitle>
                          </DrawerHeader>
                          <div className="px-3 overflow-y-auto">
                            <div className="flex gap-3 mb-6">
                              <Avatar className="h-8 w-8"><AvatarFallback>Y</AvatarFallback></Avatar>
                              <div className="flex-1">
                                <input type="text" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} className="w-full bg-transparent border-b border-border pb-1.5 text-sm focus:outline-none focus:ring-0" />
                                {commentText && (
                                  <div className="flex items-center gap-2 mt-2 justify-end">
                                    <button onClick={() => setCommentText("")} className="text-sm font-medium hover:bg-muted rounded-full px-3 py-1">Cancel</button>
                                    <button onClick={handleAddComment} className="text-sm font-medium bg-foreground text-background rounded-full px-3 py-1 disabled:opacity-50" disabled={!commentText.trim()}>Comment</button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {comments.map((comment) => (
                              <div key={comment.id} className="py-3 border-b last:border-0">
                                <div className="flex gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={comment.avatar} />
                                    <AvatarFallback>{comment.user.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{comment.user}</span>
                                      <span className="text-xs text-muted-foreground">{comment.timeAgo}</span>
                                    </div>
                                    <p className="text-sm mt-0.5">{comment.content}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <button onClick={() => handleLikeComment(comment.id)} className={`flex items-center gap-1.5 hover:bg-muted rounded-full px-2.5 py-1 transition-colors ${likedComments.has(comment.id) ? "text-primary" : "text-muted-foreground"}`}>
                                        <ThumbsUp className={`h-4 w-4 ${likedComments.has(comment.id) ? "fill-current" : ""}`} />
                                        <span className="text-xs">{comment.likes}</span>
                                      </button>
                                      <button aria-label="Dislike" onClick={() => handleDislikeComment(comment.id)} className={`hover:bg-muted rounded-full p-1 transition-colors ${dislikedComments.has(comment.id) ? "text-destructive" : "text-muted-foreground"}`}>
                                        <ThumbsDown className={`h-4 w-4 ${dislikedComments.has(comment.id) ? "fill-current" : ""}`} />
                                      </button>
                                      <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-xs text-muted-foreground hover:bg-muted rounded-full px-2.5 py-1 transition-colors">Reply</button>
                                    </div>
                                    {replyingTo === comment.id && (
                                      <InlineReplyBox onSubmit={(text) => handleReply(comment.id, text)} onCancel={() => setReplyingTo(null)} />
                                    )}
                                    {comment.replies && comment.replies.length > 0 && (
                                      <div className="mt-2">
                                        {comment.replies.map((reply: CommentReply) => (
                                          <ReplyItem
                                            key={reply.id}
                                            reply={reply}
                                            onLike={handleLikeComment}
                                            onDislike={handleDislikeComment}
                                            onReply={handleReply}
                                            isLiked={likedComments.has(reply.id)}
                                            isDisliked={dislikedComments.has(reply.id)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DrawerContent>
                      </Drawer>
                    )}
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Playlist panel */}
            <div
              className={cn(
                "rounded-xl border bg-card overflow-hidden",
                isMobile
                  ? "flex-1 min-h-0 flex flex-col"
                  : cn(WATCH_SECONDARY, "self-start")
              )}
            >
              <div className="flex-shrink-0 bg-muted/60 px-4 pb-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold leading-7 line-clamp-2">
                      <Link href={`/playlists/${playlist.slug}/${playlist.id}`} className="">
                        {playlist.name}
                      </Link>
                    </h2>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs leading-[18px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {playlist.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {playlist.isPublic ? "Public" : "Private"}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>
                        {currentVideo ? `${videos.indexOf(currentVideo) + 1} / ${videos.length}` : `${videos.length} videos`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Show or hide playlist"
                    aria-expanded={!collapsed}
                    onClick={toggleCollapse}
                    className="-mr-2 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full hover:bg-accent"
                  >
                    <ChevronDown className={cn("h-6 w-6 transition-transform", collapsed ? "rotate-180" : "")} />
                  </button>
                </div>
                {!collapsed && (
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAutoPlay((v) => !v)}
                      aria-pressed={autoPlay}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-full pl-3 pr-4 text-sm font-medium transition-colors",
                        autoPlay ? "bg-foreground text-background hover:bg-foreground/90" : "bg-background text-foreground hover:bg-accent"
                      )}
                      title={autoPlay ? "Autoplay on" : "Autoplay off"}
                    >
                      <Repeat className="h-5 w-5" />
                      Autoplay
                    </button>
                    <button
                      type="button"
                      aria-label="Shuffle"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
                      onClick={() => {
                        if (videos.length) {
                          const random = videos[Math.floor(Math.random() * videos.length)];
                          handleSelectVideo(random);
                        }
                      }}
                    >
                      <Shuffle className="h-6 w-6" />
                    </button>
                    <div className="flex-1" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <MoreButton className="-mr-2" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl py-2">
                        {playlist.isPublic && (
                          <DropdownMenuItem className={MENU_ITEM} onClick={handleShare}>
                            <Share className="h-5 w-5" /> Share
                          </DropdownMenuItem>
                        )}
                        {canEdit && !isSystemPlaylist(playlist.id) && (
                          <>
                            <DropdownMenuItem className={MENU_ITEM} onClick={() => router.push("/playlists")}>
                              <Edit className="h-5 w-5" /> Edit playlist
                            </DropdownMenuItem>
                            <DropdownMenuItem className={cn(MENU_ITEM, "text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400")} onClick={handleDeletePlaylist}>
                              <Trash2 className="h-5 w-5" /> Delete playlist
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {!collapsed && (
                <div className="px-3 py-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      aria-label="Search in playlist"
                      placeholder="Search in playlist"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-full rounded-full border border-transparent bg-muted pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-input focus:bg-background"
                    />
                    {searchQuery && (
                      <button aria-label="Clear search" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!collapsed && (
                <div
                  className={cn(
                    "pb-2",
                    isMobile
                      ? "flex-1 overflow-y-auto"
                      : "max-h-[calc(100vh-14rem)] overflow-y-auto"
                  )}
                >
                  {filteredVideos.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {searchQuery ? "No videos match your search" : "No videos in this playlist yet"}
                    </p>
                  )}
                  {filteredVideos.map((video) => {
                    const index = videos.indexOf(video);
                    const isCurrent = video.id === currentVideo?.id;
                    return (
                    <div
                      key={video.id}
                      role="button"
                      tabIndex={0}
                      aria-current={isCurrent ? "true" : undefined}
                      onClick={() => handleSelectVideo(video)}
                      onKeyDown={(e) => {
                        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          handleSelectVideo(video);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 py-1 pl-1 pr-1 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        isCurrent
                          ? "bg-accent"
                          : "hover:bg-muted"
                      )}
                      draggable={canReorder}
                      onDragStart={canReorder ? () => handleDragStart(index) : undefined}
                      onDragOver={canReorder ? (e) => handleDragOver(e, index) : undefined}
                      onDragEnd={canReorder ? handleDragEnd : undefined}
                    >
                      {/* Mobile indicator: ▶ for active, grip for others (user playlist only) */}
                      <div className="flex md:hidden items-center justify-center w-6 flex-shrink-0">
                        {isCurrent ? (
                          <Play className="h-3.5 w-3.5 text-foreground fill-current flex-shrink-0" />
                        ) : !canReorder ? (
                          <span className="text-xs text-muted-foreground">{index + 1}</span>
                        ) : (
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 cursor-grab" />
                        )}
                      </div>

                      {/* Desktop indicator: number / play icon; grip on hover for user playlists only */}
                      <div className="hidden md:flex items-center justify-center w-6 flex-shrink-0 relative">
                        <span className={cn(
                          "text-xs leading-none transition-opacity",
                          canReorder && "group-hover:opacity-0",
                          isCurrent ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {isCurrent ? <Play className="h-3.5 w-3.5 fill-current" aria-label="Now playing" /> : index + 1}
                        </span>
                        {canReorder && (
                          <GripVertical className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                        )}
                      </div>

                      {/* Thumbnail — 16:9, 120×68 */}
                      <div className="relative w-[120px] h-[68px] rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <Image
                          src={youtubeThumb(video.videoId, "small")}
                          alt={video.title}
                          fill
                          className="object-cover"
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs font-medium leading-4 text-white">
                          {video.duration}
                        </span>
                        <WatchedBar videoId={video.videoId} />
                        {isCurrent && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30">
                            <div className="h-full bg-red-600" style={{ width: "60%" }} />
                          </div>
                        )}
                      </div>

                      {/* Text: title → channel → timeAgo, left-aligned, centred in row */}
                      <div className="flex-1 min-w-0 self-start pt-0.5 text-left">
                        <h3 className="line-clamp-2 text-[15px] font-medium leading-5 [overflow-wrap:anywhere]">
                          {video.title}
                        </h3>
                        {video.channel && (
                          <p className="mt-1 truncate text-[13px] leading-[18px] text-muted-foreground">
                            {video.channel}
                          </p>
                        )}
                        <p className="truncate text-[13px] leading-[18px] text-muted-foreground">
                          {video.timeAgo}
                        </p>
                      </div>

                      {/* Three-dot: compact; with a mouse only shown on row hover/focus or while open (always shown on touch screens) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <MoreButton
                            size="sm"
                            aria-label={`More actions for ${video.title}`}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="-ml-1 self-start can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100 data-[state=open]:opacity-100"
                          />
                        </DropdownMenuTrigger>
                        {/* Menu is portaled, but React still bubbles its clicks to the row; stop that */}
                        <DropdownMenuContent align="end" className="w-56 rounded-xl py-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <DropdownMenuItem className={MENU_ITEM} onClick={() => handleSelectVideo(video)}>
                            <Play className="h-5 w-5" /> Play now
                          </DropdownMenuItem>
                          <DropdownMenuItem className={MENU_ITEM} onClick={() => toggleWatchLater(video)}>
                            <Clock className="h-5 w-5" /> {isInWatchLater(video.id) ? "Remove from Watch later" : "Save to Watch later"}
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem className={cn(MENU_ITEM, "text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400")} onClick={() => handleRemoveVideo(video)}>
                              <Trash2 className="h-5 w-5" /> Remove from playlist
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} videoUrl={shareUrl} />
      <ShareModal
        isOpen={showVideoShareModal}
        onClose={() => setShowVideoShareModal(false)}
        videoUrl={currentVideo && typeof window !== "undefined" ? `${window.location.origin}${videoPath(currentVideo)}` : ""}
      />
      {currentVideo && (
        <>
          <AddToPlaylistDialog
            video={{ id: currentVideo.id, title: currentVideo.title, channel: currentVideo.channel }}
            open={showPlaylistDialog}
            onOpenChange={setShowPlaylistDialog}
          />
          <ReportDialog
            videoTitle={currentVideo.title}
            videoId={currentVideo.id}
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
          />
        </>
      )}
    </div>
  );
}