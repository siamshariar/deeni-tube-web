// app/videos/[slug]/[id]/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { WatchedBar } from "@/components/watched-bar";
import {
  ArrowLeft,
    Clock,
  UserX,
  Flag,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  MessageCircle,
    Check,
  EyeOff,
  Send,
  X,
} from "lucide-react";
import { SaveIcon, ShareIcon } from "@/components/icons/action-icons";
import { MoreButton } from "@/components/more-button";
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
import { ShareModal } from "@/components/share-modal";
import { DescriptionText } from "@/components/description-text";
import { YouTubePlayer } from "@/components/youtube-player";
import { warmYouTube } from "@/lib/warm-youtube";
import { WATCH_COLUMNS, WATCH_PRIMARY, WATCH_SECONDARY } from "@/components/watch-layout";
import { cn } from "@/lib/utils";
import { openSaveCard } from "@/lib/save-card";
import { ReportDialog } from "@/components/report-dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useDontRecommend } from "@/hooks/useDontRecommend";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useWatchLater } from "@/hooks/useWatchLater";
import { recordWatch } from "@/hooks/useWatchHistory";
import { historyEntryForVideo } from "@/lib/history-entry";
import { notify } from "@/lib/notify";
import { videoData, VideoItem } from "@/lib/video-data"; // ✅ shared data

import type { CommentReply } from "@/lib/types";
import { youtubeThumb } from "@/lib/media-lookup";
import { getChannelHref } from "@/lib/channel-data";
import { videoPath } from "@/lib/video-url";

// YouTube-style action pill (36px tall, 24px icon) and round icon button
const PILL =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-muted pl-3 pr-4 text-sm font-medium transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:h-6 [&_svg]:w-6";
const ROUND =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:h-6 [&_svg]:w-6";
const MENU_ITEM = "flex items-center gap-4 px-4 py-2 text-sm cursor-pointer";
const DRAWER_ITEM = "flex items-center gap-4 px-4 py-3 text-[15px] hover:bg-muted active:bg-accent cursor-pointer";
// ─── Mock comments (unchanged) ─────────────────────────────────────
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

// ─── Skeletons ─────────────────────────────────────────────────────
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
                  <XIcon className="h-3.5 w-3.5" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

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

export default function VideoPlayPage() {
  const router = useRouter();
  const params = useParams();
  const routeId = decodeURIComponent((params?.id as string) ?? "");
  // Match the YouTube id used in links, or the internal id
  const video = videoData.find((v) => v.videoId === routeId) ?? videoData.find((v) => v.id === routeId);

  if (!video) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center px-4">
        <div className="text-center py-16 max-w-sm">
          <h1 className="text-xl font-semibold">Video not found</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This video may have been removed, or the link is incorrect.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => router.back()}>
              Go back
            </Button>
            <Button className="rounded-full" onClick={() => router.push("/")}>
              Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Keyed by video so likes, comments and the description reset on navigation
  return <VideoPlayView key={video.id} mainVideo={video} />;
}

function VideoPlayView({ mainVideo }: { mainVideo: VideoItem }) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");

  // The videos after this one in the catalogue, then the rest: "Up next" (and Autoplay) works through all of
  // them instead of bouncing between two
  const relatedVideos = useMemo(() => {
    const i = videoData.findIndex((v) => v.id === mainVideo.id);
    return [...videoData.slice(i + 1), ...videoData.slice(0, Math.max(0, i))];
  }, [mainVideo.id]);

  useEffect(() => {
    recordWatch(historyEntryForVideo(mainVideo));
  }, [mainVideo]);

  const [comments, setComments] = useState(mockCommentsWithReplies);
  const [commentText, setCommentText] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [relatedDrawerOpen, setRelatedDrawerOpen] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedRelatedVideo, setSelectedRelatedVideo] = useState<VideoItem | null>(null);
  const dontRecommend = useDontRecommend();
  const { isSaved } = usePlaylists();
  const { toggleWatchLater: toggleSaved, isInWatchLater } = useWatchLater();
  const toggleWatchLater = (v: VideoItem) =>
    toggleSaved({ id: v.id, title: v.title, channel: v.channel, channelAvatar: v.channelAvatar || "", thumbnail: youtubeThumb(v.videoId), views: v.views, timeAgo: v.timeAgo, duration: v.duration });
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [dislikedComments, setDislikedComments] = useState<Set<string>>(new Set());


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
  };

  // After this video: the first related one ("Up next" on our end screen, with an Autoplay countdown)
  const nextVideo = relatedVideos[0];
  const player = (
    <YouTubePlayer
      videoId={mainVideo.videoId}
      title={mainVideo.title}
      upNext={nextVideo ? { title: nextVideo.title, channel: nextVideo.channel, videoId: nextVideo.videoId, href: videoPath(nextVideo) } : null}
      onNext={nextVideo ? () => router.push(videoPath(nextVideo)) : undefined}
    />
  );

  return (
    <div className="min-h-screen bg-background pt-14">
      {/* Mobile back button – sits naturally below the fixed header */}
      {isMobile && (
        <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 w-full min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="text-[15px] font-medium line-clamp-1 text-left">
              {mainVideo.title}
            </span>
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="md:pt-6 pb-6">
        {/* Content: YouTube's watch layout (see components/watch-layout.ts) */}
        <div className="px-3 md:px-6">
          <div className={WATCH_COLUMNS}>
            <div className={WATCH_PRIMARY}>
              {/* The player, always exactly 16:9 (so YouTube adds no black bars at the sides): edge to edge on
                  phones, rounded on bigger screens. One element placed with CSS rather than a phone/desktop
                  switch in JS, so the server-rendered page already shows it (and its thumbnail) in place. */}
              <div className="relative -mx-3 aspect-video bg-black md:mx-0 md:w-full md:overflow-hidden md:rounded-xl">{player}</div>

              {/* Video info (YouTube watch page layout) */}
              <div className="mt-3">
                <h1 className="text-lg md:text-xl font-semibold md:font-bold leading-6 md:leading-7 line-clamp-2 md:line-clamp-none [overflow-wrap:anywhere]">
                  {mainVideo.title}
                </h1>

                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  {/* Channel */}
                  <Link href={getChannelHref(mainVideo.channelId)} className="flex min-w-0 items-center gap-3 self-start md:self-auto">
                    <Avatar className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0">
                      <AvatarImage src={mainVideo.channelAvatar} alt="" />
                      <AvatarFallback className="font-medium">{mainVideo.channel.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] md:text-base font-medium leading-5">{mainVideo.channel}</p>
                      <p className="text-xs leading-[18px] text-muted-foreground">780K subscribers</p>
                    </div>
                  </Link>

                  {/* Actions — a scrollable row of pills on phones */}
                  <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 scrollbar-none md:mx-0 md:overflow-visible md:px-0">
                    <button type="button" className={PILL} onClick={() => setShowShareModal(true)}>
                      <ShareIcon /> Share
                    </button>
                    <button
                      type="button"
                      className={PILL}
                      aria-pressed={isInWatchLater(mainVideo.id)}
                      onClick={() => toggleWatchLater(mainVideo)}
                    >
                      {isInWatchLater(mainVideo.id) ? <><Check /> Saved</> : <><Clock /> Watch later</>}
                    </button>
                    <button type="button" className={PILL} onClick={(e) => openSaveCard(mainVideo, e.currentTarget)}>
                      <SaveIcon filled={isSaved(mainVideo.id)} /> Save
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
                            <div className={DRAWER_ITEM} onClick={() => { setMenuDrawerOpen(false); dontRecommend(mainVideo.channelId, mainVideo.channel); }}><UserX className="h-6 w-6" /> Don&apos;t recommend channel</div>
                            <div className={DRAWER_ITEM} onClick={() => { setMenuDrawerOpen(false); notify("Video removed"); setTimeout(() => router.back(), 1000); }}><EyeOff className="h-6 w-6" /> Not interested</div>
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
                          <DropdownMenuItem className={MENU_ITEM} onSelect={() => dontRecommend(mainVideo.channelId, mainVideo.channel)}><UserX className="h-5 w-5" /> Don&apos;t recommend channel</DropdownMenuItem>
                          <DropdownMenuItem className={MENU_ITEM} onSelect={() => { notify("Video removed"); setTimeout(() => router.back(), 1000); }}><EyeOff className="h-5 w-5" /> Not interested</DropdownMenuItem>
                          <DropdownMenuItem className={MENU_ITEM} afterClose={() => setShowReportDialog(true)}><Flag className="h-5 w-5" /> Report</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Description – inline expand on desktop, modal on mobile */}
                <div className="mt-3 rounded-xl bg-muted p-3 text-sm leading-5">
                  <p className="font-medium">
                    {mainVideo.views}
                    <span className="ml-2">{mainVideo.timeAgo}</span>
                  </p>
                  {isMobile ? (
                    <>
                      <p className="mt-1 line-clamp-2 [overflow-wrap:anywhere]">{mainVideo.description}</p>
                      <button
                        type="button"
                        onClick={() => setDescriptionModalOpen(true)}
                        className="mt-1 font-medium"
                      >
                        ...more
                      </button>
                    </>
                  ) : showFullDescription || (mainVideo.description?.length ?? 0) <= 150 ? (
                    <>
                      <DescriptionText text={mainVideo.description} className="mt-1" />
                      {(mainVideo.description?.length ?? 0) > 150 && (
                        <button
                          type="button"
                          onClick={() => setShowFullDescription(false)}
                          className="mt-3 font-medium"
                        >
                          Show less
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 [overflow-wrap:anywhere]">
                      {mainVideo.description?.slice(0, 150)}...{" "}
                      <button
                        type="button"
                        onClick={() => setShowFullDescription(true)}
                        className="font-medium"
                      >
                        more
                      </button>
                    </p>
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
                      <h3 className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">{mainVideo.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{mainVideo.views} · {mainVideo.timeAgo}</p>
                      <DescriptionText text={mainVideo.description} className="mt-3 text-sm leading-relaxed" />
                    </div>
                  </DrawerContent>
                </Drawer>

                {/* Comments section — commented out; remove the false && wrapper to re-enable */}
                {false && (<div className="mt-4">
                  {!isMobile ? (
                    <div>
                      <div className="flex items-center gap-6 mb-4">
                        <MessageCircle className="h-5 w-5" />
                        <span className="font-semibold text-base">
                          {comments.length} Comments
                        </span>
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
                              <button onClick={() => setCommentText("")} className="text-sm font-medium hover:bg-muted rounded-full px-4 py-2">
                                Cancel
                              </button>
                              <button
                                onClick={handleAddComment}
                                className="text-sm font-medium bg-foreground text-background rounded-full px-4 py-2 hover:bg-foreground/90 disabled:opacity-50"
                                disabled={!commentText.trim()}
                              >
                                Comment
                              </button>
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
                                <button
                                  onClick={() => handleLikeComment(comment.id)}
                                  className={`flex items-center gap-1.5 hover:bg-muted rounded-full px-2.5 py-1 transition-colors ${
                                    likedComments.has(comment.id) ? "text-primary" : "text-muted-foreground"
                                  }`}
                                >
                                  <ThumbsUp className={`h-4 w-4 ${likedComments.has(comment.id) ? "fill-current" : ""}`} />
                                  <span className="text-xs">{comment.likes}</span>
                                </button>
                                <button aria-label="Dislike"
                                  onClick={() => handleDislikeComment(comment.id)}
                                  className={`hover:bg-muted rounded-full p-1 transition-colors ${
                                    dislikedComments.has(comment.id) ? "text-destructive" : "text-muted-foreground"
                                  }`}
                                >
                                  <ThumbsDown className={`h-4 w-4 ${dislikedComments.has(comment.id) ? "fill-current" : ""}`} />
                                </button>
                                <button
                                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                  className="text-xs text-muted-foreground hover:bg-muted rounded-full px-2.5 py-1 transition-colors"
                                >
                                  Reply
                                </button>
                              </div>
                              {replyingTo === comment.id && (
                                <InlineReplyBox onSubmit={(text) => handleReply(comment.id, text)} onCancel={() => setReplyingTo(null)} />
                              )}
                              {comment.replies?.length > 0 && (
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
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                                className="w-full bg-transparent border-b border-border pb-1.5 text-sm focus:outline-none focus:ring-0"
                              />
                              {commentText && (
                                <div className="flex items-center gap-2 mt-2 justify-end">
                                  <button onClick={() => setCommentText("")} className="text-sm font-medium hover:bg-muted rounded-full px-3 py-1">
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleAddComment}
                                    className="text-sm font-medium bg-foreground text-background rounded-full px-3 py-1 disabled:opacity-50"
                                    disabled={!commentText.trim()}
                                  >
                                    Comment
                                  </button>
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
                                    <button
                                      onClick={() => handleLikeComment(comment.id)}
                                      className={`flex items-center gap-1.5 hover:bg-muted rounded-full px-2.5 py-1 transition-colors ${
                                        likedComments.has(comment.id) ? "text-primary" : "text-muted-foreground"
                                      }`}
                                    >
                                      <ThumbsUp className={`h-4 w-4 ${likedComments.has(comment.id) ? "fill-current" : ""}`} />
                                      <span className="text-xs">{comment.likes}</span>
                                    </button>
                                    <button aria-label="Dislike"
                                      onClick={() => handleDislikeComment(comment.id)}
                                      className={`hover:bg-muted rounded-full p-1 transition-colors ${
                                        dislikedComments.has(comment.id) ? "text-destructive" : "text-muted-foreground"
                                      }`}
                                    >
                                      <ThumbsDown className={`h-4 w-4 ${dislikedComments.has(comment.id) ? "fill-current" : ""}`} />
                                    </button>
                                    <button
                                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                      className="text-xs text-muted-foreground hover:bg-muted rounded-full px-2.5 py-1 transition-colors"
                                    >
                                      Reply
                                    </button>
                                  </div>
                                  {replyingTo === comment.id && (
                                    <InlineReplyBox onSubmit={(text) => handleReply(comment.id, text)} onCancel={() => setReplyingTo(null)} />
                                  )}
                                  {comment.replies?.length > 0 && (
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
            </div>

            {/* Related Videos – Desktop */}
            {!isMobile && (
              <aside
                className={cn(WATCH_SECONDARY, "min-[1016px]:sticky min-[1016px]:top-20 min-[1016px]:flex min-[1016px]:max-h-[calc(100vh-104px)] min-[1016px]:flex-col min-[1016px]:self-start")}
                aria-labelledby="related-heading"
              >
                {/* Beside the player (from 1016px) the list stays in view and scrolls on its own, with the thin
                    scrollbar, so the page itself only scrolls as far as the description */}
                <h2 id="related-heading" className="mb-3 flex-shrink-0 text-base font-medium">Related videos</h2>
                <div
                  tabIndex={0}
                  aria-label="Related videos list"
                  className="yt-scrollbar space-y-2 focus-visible:outline-none min-[1016px]:-mr-2 min-[1016px]:min-h-0 min-[1016px]:flex-1 min-[1016px]:overflow-y-auto min-[1016px]:overflow-x-hidden min-[1016px]:overscroll-contain min-[1016px]:pr-2"
                >
                  {relatedVideos.map((v) => (
                    <div key={v.id} className="group/rel relative flex gap-2" onPointerEnter={warmYouTube}>
                      {/* Big thumbnails, as on YouTube: 46% of the column, 168–236px wide, 16:9 */}
                      <Link href={videoPath(v)} className="relative aspect-video w-[46%] min-w-[168px] max-w-[236px] flex-shrink-0 self-start overflow-hidden rounded-lg bg-muted">
                        <Image src={youtubeThumb(v.videoId)} alt={v.title} fill className="object-cover" />
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-px text-xs font-medium leading-[18px] text-white">{v.duration}</span>
                        <WatchedBar videoId={v.videoId} />
                      </Link>
                      <div className="min-w-0 flex-1 pr-7">
                        <Link href={videoPath(v)} className="block">
                          <h3 className="line-clamp-2 text-[15px] font-medium leading-5 [overflow-wrap:anywhere]">{v.title}</h3>
                        </Link>
                        <Link href={getChannelHref(v.channelId)} className="mt-1 block truncate text-[13px] leading-[18px] text-muted-foreground hover:text-foreground">{v.channel}</Link>
                        <p className="truncate text-[13px] leading-[18px] text-muted-foreground">{v.views} • {v.timeAgo}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          {/* As on YouTube: compact, and with a mouse only shown while the row is hovered or the menu is open (always shown on touch screens) */}
                          <MoreButton
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute -right-2 -top-1 can-hover:opacity-0 can-hover:group-hover/rel:opacity-100 kb:group-focus-within/rel:opacity-100 data-[state=open]:opacity-100"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 rounded-xl py-2">
                          <DropdownMenuItem className={MENU_ITEM} onSelect={() => toggleWatchLater(v)}><Clock className="h-5 w-5" /> {isInWatchLater(v.id) ? "Remove from Watch later" : "Save to Watch later"}</DropdownMenuItem>
                          <DropdownMenuItem className={MENU_ITEM} afterClose={() => openSaveCard(v)}><SaveIcon className="h-5 w-5" /> Save to playlist</DropdownMenuItem>
                          <DropdownMenuItem className={MENU_ITEM} onSelect={() => { setSelectedRelatedVideo(v); setShowShareModal(true); }}><ShareIcon className="h-5 w-5" /> Share</DropdownMenuItem>
                          <DropdownMenuItem className={MENU_ITEM} afterClose={() => { setSelectedRelatedVideo(v); setShowReportDialog(true); }}><Flag className="h-5 w-5" /> Report</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* Related Videos – Mobile */}
        {isMobile && (
          <section className="mt-6 px-3" aria-labelledby="related-heading-mobile">
            <h2 id="related-heading-mobile" className="mb-3 text-base font-medium">Related videos</h2>
            <div className="space-y-3">
              {relatedVideos.map((v) => (
                <div key={v.id} className="flex gap-3">
                  <Link href={videoPath(v)} className="relative w-40 aspect-video flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    {/* Lazy on purpose: preloading the first one measured worse (it competes with the YouTube player) */}
                    <Image src={youtubeThumb(v.videoId, "small")} alt={v.title} fill className="object-cover" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-px text-xs font-medium leading-[18px] text-white">{v.duration}</span>
                        <WatchedBar videoId={v.videoId} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={videoPath(v)} className="block">
                      <h3 className="line-clamp-2 text-[15px] font-medium leading-5 [overflow-wrap:anywhere]">{v.title}</h3>
                    </Link>
                    <p className="mt-1 truncate text-[13px] leading-[18px] text-muted-foreground">{v.channel}</p>
                    <p className="truncate text-[13px] leading-[18px] text-muted-foreground">{v.views} • {v.timeAgo}</p>
                  </div>
                  <MoreButton onClick={(e) => { e.stopPropagation(); setSelectedRelatedVideo(v); setRelatedDrawerOpen(true); }} className="-mr-2 -mt-1.5" />
                </div>
              ))}
            </div>
            {/* Single Drawer outside map — uses separate state from main video drawer */}
            <Drawer open={relatedDrawerOpen} onOpenChange={(o) => { if (!o) { setRelatedDrawerOpen(false); setSelectedRelatedVideo(null); } }}>
              <DrawerContent accessibleTitle="Video actions" className="px-0 max-h-[70vh]">
                <div className="mt-2 pb-6">
                  <div className={DRAWER_ITEM} onClick={() => { setRelatedDrawerOpen(false); if (selectedRelatedVideo) toggleWatchLater(selectedRelatedVideo); }}><Clock className="h-6 w-6" /> {selectedRelatedVideo && isInWatchLater(selectedRelatedVideo.id) ? "Remove from Watch later" : "Save to Watch later"}</div>
                  <div className={DRAWER_ITEM} onClick={() => { setRelatedDrawerOpen(false); const v = selectedRelatedVideo; setTimeout(() => { if (v) openSaveCard(v); }, 150); }}><SaveIcon className="h-6 w-6" /> Save to playlist</div>
                  <div className={DRAWER_ITEM} onClick={() => { setRelatedDrawerOpen(false); setShowShareModal(true); }}><ShareIcon className="h-6 w-6" /> Share</div>
                  <div className={DRAWER_ITEM} onClick={() => { setRelatedDrawerOpen(false); setTimeout(() => { setShowReportDialog(true); }, 150); }}><Flag className="h-6 w-6" /> Report</div>
                </div>
              </DrawerContent>
            </Drawer>
          </section>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => { setShowShareModal(false); setSelectedRelatedVideo(null); }}
        videoUrl={
          typeof window === "undefined"
            ? ""
            : selectedRelatedVideo
              ? `${window.location.origin}${videoPath(selectedRelatedVideo)}`
              : window.location.href
        }
      />
      <ReportDialog
        videoTitle={selectedRelatedVideo ? selectedRelatedVideo.title : mainVideo.title}
        videoId={selectedRelatedVideo ? selectedRelatedVideo.id : mainVideo.id}
        open={showReportDialog}
        onOpenChange={(o) => { setShowReportDialog(o); if (!o) setSelectedRelatedVideo(null); }}
      />
    </div>
  );
}