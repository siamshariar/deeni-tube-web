// components/watch-view.tsx
// The page of a video: the player, its block and the related videos. One component for both of its addresses:
//   /videos/<title>/<id>          from everywhere
//   /search/<title>/<id>?q=…      a search result, opened in the search page (`inSearch`, components/search-view): the same
//                                 page; Back goes to the results. The videos it goes on to (related, up next) are at
//                                 theirs under /videos
"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, MessageCircle, Send, VideoOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { PageBar } from "@/components/page-bar";
import { YouTubePlayer } from "@/components/youtube-player";
import { AmbientLight } from "@/components/ambient-light";
import { PLAYER_BOX, PLAYER_FRAME, WATCH_COLUMNS, WATCH_PAGE, WATCH_PRIMARY } from "@/components/watch-layout";
import { RelatedVideos } from "@/components/related-videos";
import { WatchInfo } from "@/components/watch-info";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useHydrated } from "@/lib/local-store";
import { recordWatch } from "@/hooks/useWatchHistory";
import { usePreviousVideo } from "@/hooks/use-video-trail";
import { historyEntryForVideo } from "@/lib/history-entry";
import { videoData, VideoItem } from "@/lib/video-data"; // ✅ shared data
import type { CommentReply } from "@/lib/types";
import { videoPath, videoPathForId } from "@/lib/video-url";

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

// (The browser's "?q=…", read when it's pressed, so the page can be pre-rendered without it)
const backToSearch = () => `/search${window.location.search}`;

export function WatchView({ inSearch = false }: { inSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname(); // /videos/<title>/<id> or /search/<title>/<id>
  const routeId = decodeURIComponent(pathname?.split("/")[3] ?? "");
  // Match the YouTube id used in links, or the internal id
  const video = videoData.find((v) => v.videoId === routeId) ?? videoData.find((v) => v.id === routeId);

  if (!video) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <PageBar title="Video" parent={inSearch ? backToSearch : "/"} />
        <EmptyState as="h1" icon={VideoOff} title="Video not found" description="It may have been removed, or the link is incorrect.">
          <Button onClick={() => router.push("/")}>Go to Home</Button>
        </EmptyState>
      </div>
    );
  }

  // Keyed by video so likes, comments and the description reset on navigation
  return <VideoPlayView key={video.id} mainVideo={video} inSearch={inSearch} />;
}

function VideoPlayView({ mainVideo, inSearch }: { mainVideo: VideoItem; inSearch: boolean }) {
  const parent = inSearch ? backToSearch : "/";
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const hydrated = useHydrated();

  // The videos after this one in the catalogue, then the rest: "Up next" (and Autoplay) works through all of
  // them instead of bouncing between two
  const relatedVideos = useMemo(() => {
    const i = videoData.findIndex((v) => v.id === mainVideo.id);
    return [...videoData.slice(i + 1), ...videoData.slice(0, Math.max(0, i))];
  }, [mainVideo.id]);

  useEffect(() => {
    recordWatch(historyEntryForVideo(mainVideo));
  }, [mainVideo]);

  // Opened without a request, the page's title is still the one before it
  useEffect(() => {
    if (!inSearch) return;
    const before = document.title;
    const title = `${mainVideo.title} - Deeni.tube`;
    document.title = title;
    return () => {
      // Another page has set its own by now
      if (document.title === title) document.title = before;
    };
  }, [inSearch, mainVideo.title]);

  const [comments, setComments] = useState(mockCommentsWithReplies);
  const [commentText, setCommentText] = useState("");
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
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
  const previous = usePreviousVideo(mainVideo.videoId);
  const player = (
    <YouTubePlayer
      videoId={mainVideo.videoId}
      title={mainVideo.title}
      ratio={mainVideo.ratio}
      previous={previous}
      onPrevious={previous ? () => router.push(videoPathForId(previous)) : undefined}
      upNext={nextVideo ? { title: nextVideo.title, channel: nextVideo.channel, videoId: nextVideo.videoId, href: videoPath(nextVideo) } : null}
      onNext={nextVideo ? () => router.push(videoPath(nextVideo)) : undefined}
    />
  );

  return (
    <div className="watch-page min-h-screen bg-background pt-14">
      <PageBar title={mainVideo.title} parent={parent} />

      {/* Main content */}
      <div className="pb-6">
        {/* Content: YouTube's watch layout (see components/watch-layout.ts) */}
        <div className={WATCH_PAGE}>
          <div className={WATCH_COLUMNS}>
            <div className={WATCH_PRIMARY}>
              {/* The player, always exactly 16:9 (so YouTube adds no black bars at the sides): edge to edge on
                  phones, rounded on bigger screens. One element placed with CSS rather than a phone/desktop
                  switch in JS, so the server-rendered page already shows it (and its thumbnail) in place. */}
              <div className={PLAYER_FRAME}>
                <AmbientLight videoId={mainVideo.videoId} />
                <div className={PLAYER_BOX}>{player}</div>
              </div>

              <WatchInfo video={mainVideo} parent={parent} />

              <div>
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

            {/* Until the page's script runs both lists are there and CSS shows one, so phones don't first show the desktop's */}
            {(!hydrated || !isMobile) && <RelatedVideos video={mainVideo} videos={relatedVideos} isMobile={false} />}
          </div>
        </div>

        {(!hydrated || isMobile) && <RelatedVideos video={mainVideo} videos={relatedVideos} isMobile />}
      </div>
    </div>
  );
}