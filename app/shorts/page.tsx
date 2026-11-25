// app/shorts/page.tsx
"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useSyncExternalStore, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Image from "next/image"
import { imagePriorityProps } from "@/lib/image-priority"
import { ChevronUp, ChevronDown, Heart, Flag, Volume2, VolumeX, Pause, Play, List, MessageSquare, X, ThumbsUp, ThumbsDown, Send, Eye, Clock, UserX, ArrowLeft, Check, Gauge } from "lucide-react"
import { ActionMenu } from "@/components/action-menu"
import { Drawer, DrawerContent, DrawerTitleBar } from "@/components/ui/drawer"
import { SaveIcon, ShareIcon } from "@/components/icons/action-icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreVertIcon } from "@/components/icons/more-vert-icon"
import { CCIconOff, CCIconOn, FullscreenIcon } from "@/components/icons/player-icons"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { savedSound, saveSound } from "@/lib/player-prefs"
import { CaptionsDialog } from "@/components/captions-dialog"
import { CAPTION_NOTE_MS, HIDE_CAPTIONS, languageName, moveCaptionsCommands, reportedCaptions, setCaptionsOn, shortCaptionLayout, showCaptionsCommands, useCaptions, type ReportedCaptions } from "@/lib/captions"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { DescriptionText, hashtagHref } from "@/components/description-text"
import { openFeedback, openReport, openShare } from "@/lib/dialogs"
import { notify } from "@/lib/notify"
import { onBackOnline } from "@/lib/connection";
import { openSaveCard } from "@/lib/save-card"
import { useBack } from "@/hooks/use-back"
import { useDontRecommend } from "@/hooks/useDontRecommend"
import { useMediaQuery } from "@/hooks/use-media-query"
import { recordWatch } from "@/hooks/useWatchHistory"
import { savedItem } from "@/hooks/useSavedList"
import { historyEntryForShort } from "@/lib/history-entry"
import { replacedShorts, shortsVideos as shortsData } from "@/lib/shorts-data"
import { youtubeThumb } from "@/lib/media-lookup"
import { shortRatio } from "@/lib/short-ratios"
import { useLikedVideos } from "@/hooks/useLikedVideos"
import { useWatchLater } from "@/hooks/useWatchLater"
import { allowHostSound, armHost, attachHost, detachHost, hostCommand, hostFrame, hostInfo, hostLoad, hostReady, hostShowing, hostSoundAllowed, hostWanted, revealHost, setHostVisible } from "@/lib/player-host"

import type { CommentReply, VideoComment } from "@/lib/types"

// ============ COMMENTS DATA ============
const initialCommentsByVideo: Record<string, VideoComment[]> = {
  s1: [
    { id: "s1c1", user: "Ahmad Khan", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "2 hours ago", content: "MashaAllah, beautiful reminder! May Allah bless you.", likes: 245, dislikes: 12, replies: [] },
    { id: "s1c2", user: "Fatima Hassan", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "5 hours ago", content: "SubhanAllah! This is so true.", likes: 567, dislikes: 23, replies: [] },
    { id: "s1c3", user: "Omar Farooq", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "1 day ago", content: "JazakAllah khair! Very important reminder.", likes: 189, dislikes: 8, replies: [] },
  ],
  s2: [
    { id: "s2c1", user: "Yusuf Ahmed", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "1 hour ago", content: "Allahu Akbar! Beautiful reminder.", likes: 456, dislikes: 8, replies: [] },
    { id: "s2c2", user: "Zainab Hassan", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "3 hours ago", content: "JazakAllah khair. I really needed this today.", likes: 234, dislikes: 5, replies: [] },
  ],
  s3: [
    { id: "s3c1", user: "Hamza Yusuf", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "30 minutes ago", content: "Very important ruling. May Allah guide us all.", likes: 567, dislikes: 3, replies: [] },
    { id: "s3c2", user: "Noor Fatima", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "2 hours ago", content: "MashaAllah, clear explanation.", likes: 432, dislikes: 6, replies: [] },
  ],
  s4: [
    { id: "s4c1", user: "Abdullah Rahman", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "1 day ago", content: "Beautiful seerah reminder. May Allah bless our Prophet.", likes: 312, dislikes: 4, replies: [] },
  ],
  s5: [
    { id: "s5c1", user: "Khadija Omar", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "3 days ago", content: "MashaAllah, this is so beneficial. May Allah give us tawfiq.", likes: 278, dislikes: 2, replies: [] },
  ],
  s6: [
    { id: "s6c1", user: "Ibrahim Malik", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "2 hours ago", content: "SubhanAllah, such a powerful reminder about faith.", likes: 523, dislikes: 7, replies: [] },
    { id: "s6c2", user: "Aisha Begum", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "5 hours ago", content: "May Allah protect our faith. JazakAllah khair.", likes: 345, dislikes: 3, replies: [] },
  ],
  s7: [
    { id: "s7c1", user: "Mohammed Ali", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "1 day ago", content: "SubhanAllah, patience is the key. May Allah grant us sabr.", likes: 456, dislikes: 5, replies: [] },
  ],
  s8: [
    { id: "s8c1", user: "Yasmin Khan", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "3 hours ago", content: "Beautiful reminder about dua. May Allah accept our prayers.", likes: 678, dislikes: 9, replies: [] },
    { id: "s8c2", user: "Bilal Ahmed", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "6 hours ago", content: "JazakAllah khair for this important reminder.", likes: 234, dislikes: 2, replies: [] },
  ],
}

const STORAGE_COMMENTS = 'shorts_comments'
const STORAGE_LIKED = 'shorts_liked_ids'
const STORAGE_DISLIKED = 'shorts_disliked_ids'

function loadComments(): Record<string, VideoComment[]> {
  if (typeof window === 'undefined') return JSON.parse(JSON.stringify(initialCommentsByVideo))
  try {
    const raw = localStorage.getItem(STORAGE_COMMENTS)
    if (raw) { const parsed = JSON.parse(raw); if (Object.keys(parsed).length > 0) return parsed }
  } catch {}
  const def = JSON.parse(JSON.stringify(initialCommentsByVideo))
  localStorage.setItem(STORAGE_COMMENTS, JSON.stringify(def))
  return def
}

function saveComments(data: Record<string, VideoComment[]>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_COMMENTS, JSON.stringify(data))
}

function loadIds(key: string): string[] {
  if (typeof window === 'undefined') return []
  try { const ids = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(ids) ? ids : [] } catch { return [] }
}

function saveIds(key: string, ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(ids))
}

const commentsByVideo = loadComments()

// Action buttons (like, comment, share...): white on a dark scrim over the video on phones and tablets;
// beside the video on wider screens, as YouTube's grey round buttons (#f2f2f2 light / #272727 dark)
// Phones and tablets: sized by the screen's height (34-48px), so the whole rail fits between the top controls and
// the title on any phone, also in Safari with its toolbars showing
const actionCircleClass =
  "h-[clamp(34px,6svh,48px)] w-[clamp(34px,6svh,48px)] lg:h-12 lg:w-12 rounded-full flex items-center justify-center transition-colors bg-black/40 text-white group-hover:bg-black/60 group-active:scale-95 lg:bg-secondary lg:text-foreground lg:group-hover:bg-accent low:bg-secondary low:text-foreground low:group-hover:bg-accent"
const actionLabelClass =
  "text-xs font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] lg:text-sm lg:font-normal lg:text-foreground lg:[text-shadow:none] low:text-foreground low:[text-shadow:none]"
// The buttons at the top of the video. Phones held sideways (and windows as low; `low`): beside it, like the actions
const topButtonClass =
  "h-10 w-10 flex-shrink-0 rounded-full items-center justify-center bg-black/40 text-white transition-colors hover:bg-black/60 low:bg-secondary low:text-foreground low:hover:bg-accent"

// ============ YOUTUBE PLAYER MESSAGING ============
// Players are YouTube embeds driven through YouTube's postMessage protocol (enablejsapi=1).
// On iPhone, iPad and Safari the page uses the app's one shared player instead (lib/player-host.ts, on
// youtube-nocookie.com): one player for every short, so once a tap gave it sound, swiping keeps the sound.
const YT_ORIGIN = "https://www.youtube.com"
const HOST_ORIGIN = "https://www.youtube-nocookie.com"
const noSubscribe = () => () => {}
// infoDelivery.playerState values
const YT_ENDED = 0
const YT_PLAYING = 1
const YT_PAUSED = 2
const YT_BUFFERING = 3
// Shorts this many places above/below the active one keep a loaded, paused player,
// so switching to them starts playback at once instead of showing a black frame
const PRELOAD_RANGE = 1
// A short that doesn't play (its stream stalls, its player never answers): seconds until the spinner, until its
// player is loaded again (once), and from then until the page says so and offers to try again. Twice as long for a
// player that hasn't answered yet, or that stopped to load while playing: on a slow network both may still work
const SPINNER_AFTER = 1
const RELOAD_AFTER = 10
const GIVE_UP_AFTER = 15

function ytPost(iframe: HTMLIFrameElement | null | undefined, message: Record<string, unknown>) {
  iframe?.contentWindow?.postMessage(JSON.stringify(message), YT_ORIGIN)
}

function ytCommand(iframe: HTMLIFrameElement | null | undefined, func: string, args: unknown[] = []) {
  // The shared player: through lib/player-host (it keeps its own state, e.g. a muted video stays muted)
  if (iframe && iframe === hostFrame()) hostCommand(func, args)
  else ytPost(iframe, { event: "command", func, args })
}

// Mock comments use a grey placeholder image; show the commenter's initial instead
const avatarSrc = (src?: string) => (src && !src.includes("placeholder.svg") ? src : undefined)

// ============ ICON COMPONENTS ============

/** The short with this YouTube id (a replaced short's old links open the one that took its place); -1: none. */
function shortIndex(videoId: string | null): number {
  const id = videoId && (replacedShorts[videoId] ?? videoId)
  return id ? shortsData.findIndex((short) => short.videoId === id) : -1
}

// ============ COVER ============

// YouTube answers a missing picture with a 120×90 grey one
const MISSING = { width: 120, height: 90 }

/**
 * What a short shows in its box until its video plays: the video's first frame (YouTube's frame0.jpg, about
 * 270×480, or 480×480 for a square video), fitted like YouTube's player fits the video (contain, in the same 9:16
 * box), so the picture doesn't change when the video starts, as in YouTube's own apps and KinTube. If YouTube
 * has no first frame, the thumbnail.
 */
function ShortCover({ videoId, thumbnail, title, priority }: { videoId: string; thumbnail: string; title: string; priority: boolean }) {
  const [noFirstFrame, setNoFirstFrame] = useState(false)
  const loading = priority ? imagePriorityProps("lcp") : { loading: "lazy" as const }
  if (noFirstFrame) return <Image src={thumbnail} alt={title} fill className="object-cover" {...loading} />
  return (
    <Image
      src={`https://img.youtube.com/vi/${videoId}/frame0.jpg`}
      alt={title}
      fill
      className="object-contain"
      onError={() => setNoFirstFrame(true)}
      onLoad={(e) => {
        const img = e.currentTarget
        if (img.naturalWidth === MISSING.width && img.naturalHeight === MISSING.height) setNoFirstFrame(true)
      }}
      {...loading}
    />
  )
}

// ============ SKELETONS ============

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-7 w-14 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function DescriptionSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto yt-scrollbar">
      <div className="px-4 py-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="px-4 pb-3 flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="px-4 pb-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  )
}

// ============ REPLY ITEM ============

function ReplyItem({ reply, onLike, onDislike, onReplyNested }: {
  reply: CommentReply
  onLike: (commentId: string, replyId: string) => void
  onDislike: (commentId: string, replyId: string) => void
  onReplyNested: (commentId: string, replyId: string, text: string) => void
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")
  const isLiked = reply._isLiked || false
  const isDisliked = reply._isDisliked || false

  const handleReplySubmit = () => {
    if (!replyText.trim()) return
    onReplyNested(reply.parentId || '', reply.id, replyText.trim())
    setReplyText(""); setShowReplyInput(false)
  }

  const formatCount = (n: number) => n > 999 ? `${(n/1000).toFixed(1)}K` : String(n)

  return (
    <div className="ml-10 mt-2">
      <div className="flex gap-2.5">
        <Avatar className="h-7 w-7 flex-shrink-0"><AvatarImage src={avatarSrc(reply.avatar)} /><AvatarFallback className="bg-muted text-foreground text-xs font-medium">{reply.user.charAt(0)}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">@{reply.user.split(' ')[0]}</span>
            <span className="text-xs text-muted-foreground">{reply.timeAgo}</span>
          </div>
          <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]">{reply.content}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={() => onLike(reply.parentId || '', reply.id)} className={cn("flex items-center gap-1.5 hover:bg-muted rounded-full px-2.5 py-1 transition-colors", isLiked ? "text-primary" : "text-muted-foreground")}>
              <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
              <span className="text-xs">{formatCount(reply.likes)}</span>
            </button>
            <button aria-label="Dislike" onClick={() => onDislike(reply.parentId || '', reply.id)} className={cn("hover:bg-muted rounded-full p-1 transition-colors", isDisliked ? "text-destructive" : "text-muted-foreground")}>
              <ThumbsDown className={cn("h-4 w-4", isDisliked && "fill-current")} />
            </button>
            <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-xs font-medium text-foreground hover:bg-muted rounded-full px-2.5 py-1 transition-colors">Reply</button>
            <div className="-my-2 -mr-2 ml-auto">
              <ActionMenu title="Comment actions" actions={[{ id: "report", label: "Report", icon: Flag, opens: true, onSelect: () => openReport("comment", reply.content) }]} />
            </div>
          </div>
          {showReplyInput && (
            <div className="mt-2 flex gap-2">
              <Avatar className="h-6 w-6 flex-shrink-0"><AvatarFallback className="bg-muted text-foreground text-[10px]">Y</AvatarFallback></Avatar>
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleReplySubmit() }}
                  className="flex-1 bg-transparent border-b border-border pb-1 text-base text-foreground md:text-xs placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  autoFocus
                />
                <button aria-label="Post comment" onClick={handleReplySubmit} disabled={!replyText.trim()} className="text-primary hover:text-primary/80 disabled:opacity-30">
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Cancel reply" onClick={() => setShowReplyInput(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ COMMENT ITEM ============

function CommentItem({ comment, onLikeComment, onDislikeComment, onReplyComment, onLikeReply, onDislikeReply, onReplyNested }: {
  comment: VideoComment
  onLikeComment: (id: string) => void
  onDislikeComment: (id: string) => void
  onReplyComment: (id: string, text: string) => void
  onLikeReply: (cid: string, rid: string) => void
  onDislikeReply: (cid: string, rid: string) => void
  onReplyNested: (cid: string, rid: string, text: string) => void
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [showReplies, setShowReplies] = useState(false)
  const isLiked = comment._isLiked || false
  const isDisliked = comment._isDisliked || false

  const handleReplySubmit = () => {
    if (!replyText.trim()) return
    onReplyComment(comment.id, replyText.trim())
    setReplyText(""); setShowReplyInput(false); setShowReplies(true)
  }

  const formatCount = (n: number) => n > 999 ? `${(n/1000).toFixed(1)}K` : String(n)
  const repliesWithParent = (comment.replies || []).map((r: CommentReply) => ({ ...r, parentId: comment.id }))

  return (
    <div className="py-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"><AvatarImage src={avatarSrc(comment.avatar)} /><AvatarFallback className="bg-muted text-foreground text-sm font-medium">{comment.user.charAt(0)}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">@{comment.user.split(' ')[0]}</span>
            <span className="text-xs text-muted-foreground">{comment.timeAgo}</span>
          </div>
          <p className="text-sm text-foreground mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{comment.content}</p>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => onLikeComment(comment.id)} className={cn("flex items-center gap-1.5 hover:bg-muted rounded-full px-3 py-1.5 transition-colors", isLiked ? "text-primary" : "text-muted-foreground")}>
              <ThumbsUp className={cn("h-5 w-5", isLiked && "fill-current")} />
              <span className="text-xs">{formatCount(comment.likes)}</span>
            </button>
            <button aria-label="Dislike" onClick={() => onDislikeComment(comment.id)} className={cn("hover:bg-muted rounded-full p-1.5 transition-colors", isDisliked ? "text-destructive" : "text-muted-foreground")}>
              <ThumbsDown className={cn("h-5 w-5", isDisliked && "fill-current")} />
            </button>
            <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-xs font-medium text-foreground hover:bg-muted rounded-full px-3 py-1.5 transition-colors">Reply</button>
            <div className="-my-2 -mr-2 ml-auto">
              <ActionMenu title="Comment actions" actions={[{ id: "report", label: "Report", icon: Flag, opens: true, onSelect: () => openReport("comment", comment.content) }]} />
            </div>
          </div>
          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <Avatar className="h-7 w-7 flex-shrink-0"><AvatarFallback className="bg-muted text-foreground text-[10px]">Y</AvatarFallback></Avatar>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleReplySubmit() }}
                  className="flex-1 bg-transparent border-b border-border pb-1 text-base text-foreground md:text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  autoFocus
                />
                <button aria-label="Post comment" onClick={handleReplySubmit} disabled={!replyText.trim()} className="text-primary hover:text-primary/80 disabled:opacity-30">
                  <Send className="h-4 w-4" />
                </button>
                <button aria-label="Cancel reply" onClick={() => setShowReplyInput(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <button onClick={() => setShowReplies(!showReplies)} className="flex items-center gap-1.5 mt-2 text-sm text-primary hover:text-primary/80 font-medium">
              <ChevronDown className={`h-4 w-4 transition-transform ${showReplies ? 'rotate-180' : ''}`} />
              {showReplies ? 'Hide' : comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>
      {showReplies && repliesWithParent.map((r: CommentReply) => (
        <ReplyItem key={r.id} reply={r} onLike={onLikeReply} onDislike={onDislikeReply} onReplyNested={onReplyNested} />
      ))}
    </div>
  )
}

// ============ MAIN COMPONENT ============

function ShortsPageContent() {
  const searchParams = useSearchParams()
  // The short the address is about: /shorts/<id>, or /shorts?v=<id>
  const { id: pathId } = useParams<{ id?: string }>()
  const addressed = searchParams.get("v") ?? pathId ?? null
  const back = useBack("/")
  const containerRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  // A link to a short (/shorts?v=ID) starts right on it: only its player loads, with no jump from the first
  // short (this content renders on the client, inside Suspense, so the search params are known here)
  const [initialIndex] = useState(() => Math.max(0, shortIndex(addressed)))
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  // Media queries (not window.innerWidth) so server and first client render match
  const isDesktopViewport = useMediaQuery("(min-width: 768px)")
  const isWideViewport = useMediaQuery("(min-width: 1440px)")
  // Comments and description: beside the video (the short makes room), or a sheet over it where there's no room
  const isSidePanel = useMediaQuery("(min-width: 1024px) and (min-height: 561px)")
  const isRoomy = useMediaQuery("(min-width: 1280px)")
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const { isLiked: isLikedShort, like, unlike } = useLikedVideos()
  const { toggleWatchLater, isInWatchLater } = useWatchLater()
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [volume, setVolume] = useState(100)
  const [, setIsFullscreen] = useState(false)
  const dontRecommend = useDontRecommend()
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  // What the sheet still shows while it slides away
  const [lastPanel, setLastPanel] = useState<PanelType>(null)
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<VideoComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [descLoading, setDescLoading] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [likedIds, setLikedIds] = useState<string[]>(() => loadIds(STORAGE_LIKED))
  const [dislikedIds, setDislikedIds] = useState<string[]>(() => loadIds(STORAGE_DISLIKED))
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(240)
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const commentsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const descTimerRef = useRef<NodeJS.Timeout | null>(null)
  const videoRefs = useRef<Map<string, HTMLIFrameElement>>(new Map())
  // iPhone, iPad, Safari: the shared player plays the short on screen (known after hydration)
  const hosted = useSyncExternalStore(noSubscribe, hostWanted, () => false)
  const boxRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const hostTokenRef = useRef(0)
  // The ?v= value already shown (later changes, e.g. from a notification, scroll to the new short)
  const shownVideoParamRef = useRef(addressed)
  // Set while a keyboard/arrow-button scroll is animating towards this index
  const scrollTargetRef = useRef<number | null>(null)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const videoDurationRef = useRef(0)
  const [, setIsProgressTouch] = useState(false)
  const [isProgressHovered, setIsProgressHovered] = useState(false)
  const [showPlayFeedback, setShowPlayFeedback] = useState(false)
  const playFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isSeekingRef = useRef(false)
  // Mirrors isSeekingRef for rendering (refs must not be read during render)
  const [isSeeking, setIsSeeking] = useState(false)
  const isMutedRef = useRef(isMuted)
  const volumeRef = useRef(volume)
  // Player bookkeeping per <iframe> element (a short's player is recreated when it scrolls back into range)
  const readyPlayersRef = useRef(new WeakSet<HTMLIFrameElement>())   // answered the 'listening' handshake
  const primedPlayersRef = useRef(new WeakSet<HTMLIFrameElement>())  // buffered their first frames while off screen
  const playerStatesRef = useRef(new WeakMap<HTMLIFrameElement, number>())
  const currentIndexRef = useRef(initialIndex)
  const userPausedRef = useRef(false)
  // Checks after each switch that the active short really plays (see startPlayer)
  const playWatchRef = useRef<NodeJS.Timeout | null>(null)
  // Set once the active short has reported "playing" since it became active; until then, passing
  // states (unstarted, cued, the paused state left by priming) don't flip the UI to "paused"
  const activePlayedRef = useRef(false)
  // Muted because the browser blocked sound (not by the visitor): the sound comes back at their next
  // click, tap or key press
  const [autoMuted, setAutoMuted] = useState(false)
  const autoMutedRef = useRef(false)
  // Clicks that turned the sound back on; a tap on the video that does this doesn't also pause it
  const soundRestoringEventsRef = useRef(new WeakSet<Event>())
  // Time of the last scroll event: a tap that stops a swipe isn't meant as play/pause
  const lastScrollAtRef = useRef(0)
  // The active short's thumbnail stays on top until its player is actually playing
  const [startedId, setStartedId] = useState<string | null>(null)
  // The active short isn't playing (yet): the spinner; and why it can't: YouTube says it's unavailable, or it never
  // started (the message with "Try again")
  const [isSlow, setIsSlow] = useState(false)
  const [playIssue, setPlayIssue] = useState<{ id: string; kind: "unavailable" | "stalled" | "offline" } | null>(null)
  // A player that got stuck is loaded again: a new <iframe> (its key), going on from where it stopped
  const [playerLoads, setPlayerLoads] = useState<Record<string, number>>({})
  const reloadedRef = useRef<{ id: string; at: number } | null>(null)
  // The visitor pressed play on a short that hadn't started
  const pressedPlayRef = useRef(false)
  // YouTube's error for a player (also one preloaded off screen, which says it only once)
  const playerErrorsRef = useRef(new WeakMap<HTMLIFrameElement, number>())
  const currentTimeRef = useRef(0)
  // Neighbouring players load once the first short has started, so they don't slow it down
  const [preloadNeighbors, setPreloadNeighbors] = useState(false)
  const neighborTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Feedback dialog state

  useEffect(() => {
    const syncSidebarWidth = () => {
      if (typeof window === "undefined") return
      const isCollapsed = typeof window.__sidebarGetState === "function"
        ? window.__sidebarGetState()
        : false
      setDesktopSidebarWidth(isCollapsed ? 72 : 240)
    }

    syncSidebarWidth()
    window.addEventListener("sidebar-state-change", syncSidebarWidth)
    window.addEventListener("resize", syncSidebarWidth)

    return () => {
      window.removeEventListener("sidebar-state-change", syncSidebarWidth)
      window.removeEventListener("resize", syncSidebarWidth)
    }
  }, [])

  const currentShort = shortsData[currentIndex]
  // What each short's player says about its captions, once that part of it has loaded
  const [captionReports, setCaptionReports] = useState<Record<string, ReportedCaptions>>({})
  const captionReport = currentShort && captionReports[currentShort.id]
  const { tracks: captionTracks, on: captions, choice: captionChoice, available: hasCaptions } = useCaptions(currentShort?.videoId ?? "", captionReport)
  const [captionsOpen, setCaptionsOpen] = useState(false)

  useEffect(() => {
    if (!currentShort) return
    const s = currentShort
    const timer = setTimeout(() => recordWatch(historyEntryForShort(s)), 1500)
    return () => clearTimeout(timer)
  }, [currentShort])

  // Sync liked/disliked to localStorage
  useEffect(() => { saveIds(STORAGE_LIKED, likedIds) }, [likedIds])
  useEffect(() => { saveIds(STORAGE_DISLIKED, dislikedIds) }, [dislikedIds])

  useEffect(() => { return () => { if (commentsTimerRef.current) clearTimeout(commentsTimerRef.current); if (descTimerRef.current) clearTimeout(descTimerRef.current) } }, [])

  // Open on the linked short: scroll there before the first paint
  useLayoutEffect(() => {
    const c = containerRef.current
    if (!c || initialIndex === 0) return
    const sectionH = (c.firstElementChild as HTMLElement)?.offsetHeight || c.clientHeight
    c.scrollTop = initialIndex * sectionH
  }, [initialIndex])

  // A new ?v= while the page is open: go to that short
  useEffect(() => {
    const v = addressed
    if (!v || v === shownVideoParamRef.current) return
    shownVideoParamRef.current = v
    const targetIndex = shortIndex(v)
    const c = containerRef.current
    if (targetIndex === -1 || !c) return
    const sectionH = (c.firstElementChild as HTMLElement)?.offsetHeight || c.clientHeight
    setCurrentIndex(targetIndex)
    c.scrollTo({ top: targetIndex * sectionH, behavior: "instant" as ScrollBehavior })
  }, [addressed])

  const loadCommentsForCurrentShort = () => {
    setCommentsLoading(true)
    setComments([])
    if (commentsTimerRef.current) clearTimeout(commentsTimerRef.current)
    commentsTimerRef.current = setTimeout(() => {
      const src = commentsByVideo[currentShort?.id] || []
      const loaded = src.map((c: VideoComment) => ({
        ...c,
        _isLiked: likedIds.includes(c.id),
        _isDisliked: dislikedIds.includes(c.id),
        replies: (c.replies || []).map((r: CommentReply) => ({
          ...r,
          _isLiked: likedIds.includes(r.id),
          _isDisliked: dislikedIds.includes(r.id),
        }))
      }))
      setComments(loaded)
      setCommentsLoading(false)
    }, 600)
  }

  const loadDescriptionForCurrentShort = () => {
    setDescLoading(true)
    if (descTimerRef.current) clearTimeout(descTimerRef.current)
    descTimerRef.current = setTimeout(() => setDescLoading(false), 400)
  }

  // Reload the open panel only when the short changes (opening a panel loads it already)
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (activePanel === "comments") loadCommentsForCurrentShort(); else if (activePanel === "description") loadDescriptionForCurrentShort() }, [currentIndex])

  // Handle scroll to update current index and control video playback
  useEffect(() => {
    const container = containerRef.current; if (!container) return
    const indexInView = () => {
      const sectionH = (container.firstElementChild as HTMLElement)?.offsetHeight || container.clientHeight
      return Math.max(0, Math.min(Math.round(container.scrollTop / sectionH), shortsData.length - 1))
    }
    // Scrolling has stopped: the short in view is the active one
    const settle = () => {
      scrollTargetRef.current = null
      const newIdx = indexInView()
      if (newIdx !== currentIndex) setCurrentIndex(newIdx)
    }
    const settleSoon = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
      scrollTimeout.current = setTimeout(() => { setIsScrolling(false); settle() }, 250)
    }
    const handleScroll = () => {
      lastScrollAtRef.current = Date.now()
      setIsScrolling(true)
      // Fallback for browsers without the 'scrollend' event
      settleSoon()
      // A keyboard/arrow scroll already set the index; don't flip it back halfway through the animation
      if (scrollTargetRef.current !== null) return
      const newIdx = indexInView()
      if (newIdx !== currentIndex) setCurrentIndex(newIdx)
    }
    const handleScrollEnd = () => {
      // An arrow key pressed while the feed still slides: Safari reports the end of the slide it cut short, halfway.
      // The new one is on its way to its own short (this used to jump back to the one in between)
      if (scrollTargetRef.current !== null && indexInView() !== scrollTargetRef.current) return settleSoon()
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
      setIsScrolling(false)
      settle()
    }
    container.addEventListener("scroll", handleScroll, { passive: true })
    container.addEventListener("scrollend", handleScrollEnd)
    return () => {
      container.removeEventListener("scroll", handleScroll)
      container.removeEventListener("scrollend", handleScrollEnd)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [currentIndex])

  // Guarantee controls always appear after every video switch (safety net for long snap animations)
  useEffect(() => {
    const timer = setTimeout(() => setIsScrolling(false), 500)
    return () => clearTimeout(timer)
  }, [currentIndex])

  // YouTube only sends events after the page says it's 'listening'; repeat until the player answers
  const registerPlayer = useCallback((id: string) => {
    let tries = 0
    const ping = () => {
      const iframe = videoRefs.current.get(id)
      if (!iframe?.isConnected || readyPlayersRef.current.has(iframe) || tries++ >= 60) return
      ytPost(iframe, { event: "listening", id })
      setTimeout(ping, tries < 20 ? 250 : 1000)
    }
    ping()
  }, [])

  // Browsers only allow playback with sound once the visitor has clicked, tapped or pressed a key on the
  // page (scrolling with the mouse wheel or a swipe doesn't count). Until then, play muted, as YouTube does.
  const muteAutomatically = useCallback(() => {
    isMutedRef.current = true
    autoMutedRef.current = true
    setIsMuted(true)
    setAutoMuted(true)
  }, [])

  // The active short really plays: hide its thumbnail (the shared player: once YouTube has drawn it at this size)
  const markPlaying = useCallback((id: string, iframe: HTMLIFrameElement) => {
    playerStatesRef.current.set(iframe, YT_PLAYING)
    activePlayedRef.current = true
    setIsPlaying(true)
    setIsSlow(false)
    setPlayIssue(null)
    if (iframe === hostFrame()) revealHost(() => { if (shortsData[currentIndexRef.current]?.id === id) setStartedId(id) })
    else setStartedId(id)
  }, [])

  // Load the active short's player again: a stream that stalled usually plays in a new player
  const reloadPlayer = useCallback((id: string) => {
    const short = shortsData[currentIndexRef.current]
    if (short?.id !== id) return
    const iframe = videoRefs.current.get(id)
    const at = currentTimeRef.current
    reloadedRef.current = { id, at }
    // Back under its cover until it plays again
    activePlayedRef.current = false
    setStartedId(null)
    setIsPlaying(true)
    if (iframe && iframe === hostFrame()) {
      setHostVisible(false)
      playerStatesRef.current.delete(iframe)
      hostLoad(short.videoId, !isMutedRef.current, true)
      if (at > 1) ytCommand(iframe, "seekTo", [at, true])
      ytCommand(iframe, "playVideo")
    } else {
      // Without the preloaded neighbours meanwhile (a weak phone may not manage several players); they come back
      // once this one plays
      if (neighborTimerRef.current) clearTimeout(neighborTimerRef.current)
      neighborTimerRef.current = null
      setPreloadNeighbors(false)
      setPlayerLoads((loads) => ({ ...loads, [id]: (loads[id] ?? 0) + 1 }))
    }
  }, [])

  // Watchdog: a play command can get lost while the player is busy (loading, seeking), which left shorts paused, and
  // a stream can stall, which left them on their thumbnail for good. Until the short plays: ask again (muted as a
  // last resort; normally the player reports a blocked autoplay right away: see onAutoplayBlocked below), show the
  // spinner, then load its player again once, then say it isn't playing.
  const watchPlayback = useCallback((id: string) => {
    if (playWatchRef.current) clearTimeout(playWatchRef.current)
    let seconds = 0
    const check = () => {
      playWatchRef.current = null
      const iframe = videoRefs.current.get(id)
      const state = iframe && playerStatesRef.current.get(iframe)
      const reloaded = reloadedRef.current?.id === id
      if (
        shortsData[currentIndexRef.current]?.id !== id ||
        userPausedRef.current ||
        state === YT_PLAYING ||
        // Paused after it had played (by the phone, another app…): the play button shows, nothing to repair
        (state === YT_PAUSED && activePlayedRef.current) ||
        (iframe && playerErrorsRef.current.has(iframe))
      ) return setIsSlow(false)
      // No connection: say so and wait for it (loading the player now would leave the browser's error page in it)
      if (!navigator.onLine) {
        setIsSlow(false)
        setIsPlaying(false)
        setPlayIssue({ id, kind: "offline" })
        return
      }
      // The shared player only reports changes: take a "playing" that came before it said which video it shows
      if (iframe && iframe === hostFrame() && hostInfo().playerState === YT_PLAYING && hostShowing() === shortsData[currentIndexRef.current].videoId) return markPlaying(id, iframe)
      // In the background players may wait: go on when the page is back
      if (document.hidden) {
        playWatchRef.current = setTimeout(check, 1000)
        return
      }
      seconds++
      if (seconds >= SPINNER_AFTER) setIsSlow(true)
      const ready = !!iframe && readyPlayersRef.current.has(iframe)
      if (ready && state !== YT_BUFFERING && seconds <= 5) {
        // (Not the shared player: muted there, every later short would stay muted until a tap)
        if (seconds >= 3 && !isMutedRef.current && iframe !== hostFrame()) {
          muteAutomatically()
          ytCommand(iframe, "mute")
        }
        ytCommand(iframe, "playVideo")
        // It may be waiting for a tap (a phone saving power): show the play button
        if (seconds === 5 && !reloaded && !pressedPlayRef.current) setIsPlaying(false)
      }
      if (seconds >= (reloaded ? GIVE_UP_AFTER : RELOAD_AFTER) * (ready && !activePlayedRef.current ? 1 : 2)) {
        if (reloaded) {
          setIsSlow(false)
          setIsPlaying(false)
          setPlayIssue({ id, kind: "stalled" })
          return
        }
        reloadPlayer(id)
        seconds = 0
      }
      playWatchRef.current = setTimeout(check, 1000)
    }
    playWatchRef.current = setTimeout(check, 1000)
  }, [muteAutomatically, markPlaying, reloadPlayer])

  // Start the active short's player with the current mute/volume settings
  const startPlayer = useCallback((id: string) => {
    const iframe = videoRefs.current.get(id)
    if (!iframe) return
    // The shared player before any tap (opened from a link): Safari would stop it if asked for sound, so play
    // it muted with "Tap to unmute" (that tap gives it sound for the rest of the visit)
    if (iframe === hostFrame() && !isMutedRef.current && !hostSoundAllowed()) muteAutomatically()
    ytCommand(iframe, isMutedRef.current ? "mute" : "unMute")
    ytCommand(iframe, "setVolume", [volumeRef.current])
    // A player loaded again goes on from where it got stuck
    if (reloadedRef.current?.id === id && reloadedRef.current.at > 1) {
      ytCommand(iframe, "seekTo", [reloadedRef.current.at, true])
      reloadedRef.current.at = 0
    }
    ytCommand(iframe, "playVideo")
    watchPlayback(id)
  }, [muteAutomatically, watchPlayback])

  useEffect(() => () => { if (playWatchRef.current) clearTimeout(playWatchRef.current) }, [])

  // Turn the sound back on after it was muted automatically (inside a tap, click or key press)
  const restoreSound = useCallback(() => {
    if (!autoMutedRef.current) return false
    allowHostSound()
    autoMutedRef.current = false
    setAutoMuted(false)
    isMutedRef.current = false
    setIsMuted(false)
    const activeId = shortsData[currentIndexRef.current]?.id
    if (activeId && !userPausedRef.current) startPlayer(activeId)
    return true
  }, [startPlayer])

  // The visitor's first click or key press allows sound: bring it back (except on the mute button itself,
  // which handles the click)
  useEffect(() => {
    const onInteract = (e: Event) => {
      if (!autoMutedRef.current) return
      if (e instanceof KeyboardEvent && (e.key === "Escape" || e.repeat)) return
      if ((e.target as Element | null)?.closest?.("[data-mute-toggle]")) return
      const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
      if (activation && !activation.hasBeenActive) return
      if (restoreSound()) soundRestoringEventsRef.current.add(e)
    }
    window.addEventListener("click", onInteract, true)
    window.addEventListener("keydown", onInteract, true)
    return () => {
      window.removeEventListener("click", onInteract, true)
      window.removeEventListener("keydown", onInteract, true)
    }
  }, [restoreSound])

  // Neighbouring players load a moment after the first short starts, when the browser is idle, so
  // they don't compete with it (each YouTube player is a lot of script). Fallback: after 6s anyway.
  const scheduleNeighbors = useCallback((delay: number) => {
    if (neighborTimerRef.current) return
    neighborTimerRef.current = setTimeout(() => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      if (ric) ric(() => setPreloadNeighbors(true), { timeout: 2000 })
      else setPreloadNeighbors(true)
    }, delay)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => scheduleNeighbors(0), 6000)
    return () => {
      clearTimeout(t)
      if (neighborTimerRef.current) clearTimeout(neighborTimerRef.current)
    }
  }, [scheduleNeighbors])

  // Listen to the YouTube players: readiness, progress and play state
  useEffect(() => {
    const onYTMessage = (e: MessageEvent) => {
      if (e.origin !== YT_ORIGIN && e.origin !== HOST_ORIGIN) return
      let d
      try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data } catch { return }
      // Which short's player sent it?
      let id: string | undefined
      videoRefs.current.forEach((f, key) => { if (f.contentWindow && f.contentWindow === e.source) id = key })
      const iframe = id ? videoRefs.current.get(id) : undefined
      if (!id || !iframe) return
      const isActivePlayer = id === shortsData[currentIndexRef.current]?.id

      if ((d?.event === "onReady" || d?.event === "initialDelivery") && !readyPlayersRef.current.has(iframe)) {
        readyPlayersRef.current.add(iframe)
        // Ask to be told when the browser blocks playback (YouTube only sends this event on request)
        ytCommand(iframe, "addEventListener", ["onAutoplayBlocked"])
        if (isActivePlayer) startPlayer(id)
        else if (shortsData[currentIndexRef.current + 1]?.id === id) {
          // The next short: play it muted until it starts, then pause it (below) so it begins buffering
          ytCommand(iframe, "mute")
          ytCommand(iframe, "playVideo")
        }
      }

      if (d?.event === "onAutoplayBlocked") {
        if (!isActivePlayer || userPausedRef.current) return
        if (!isMutedRef.current) {
          // Sound isn't allowed yet: play muted right away instead of sitting paused
          muteAutomatically()
          ytCommand(iframe, "mute")
          ytCommand(iframe, "playVideo")
        } else {
          // Even muted playback is blocked: show the play button and wait for a tap
          if (playWatchRef.current) clearTimeout(playWatchRef.current)
          setIsSlow(false)
          setIsPlaying(false)
        }
        return
      }

      // This short can't be played (removed, private, not allowed outside YouTube…). A preloaded one says so only
      // once, so it's kept for when it's on screen. The shared player: only about the short it was last given
      if (d?.event === "onError") {
        if (iframe === hostFrame() && (hostShowing() ?? shortsData[currentIndexRef.current]?.videoId) !== shortsData[currentIndexRef.current]?.videoId) return
        playerErrorsRef.current.set(iframe, Number(d.info) || 0)
        if (isActivePlayer) {
          setIsPlaying(false)
          setPlayIssue({ id, kind: "unavailable" })
        }
        return
      }

      if ((d?.event !== "infoDelivery" && d?.event !== "initialDelivery") || !d.info) return
      // The shared player still reporting the short before (or the placeholder): not this short's state
      if (iframe === hostFrame()) {
        const showing = d.info.videoData?.video_id ?? hostShowing()
        if (showing && showing !== shortsData[currentIndexRef.current]?.videoId) return
      }
      if (d.info.captions) {
        const report = reportedCaptions(d.info.captions)
        const of = id
        setCaptionReports((all) => (all[of]?.key === report.key ? all : { ...all, [of]: report }))
      }
      const state = d.info.playerState
      if (typeof state === "number") playerStatesRef.current.set(iframe, state)

      if (!isActivePlayer) {
        // The next short has started (muted, hidden under its thumbnail): pause it back at the beginning.
        // This loads its stream ahead of time, which roughly halves the wait when you switch to it.
        if (state === YT_PLAYING && !primedPlayersRef.current.has(iframe)) {
          primedPlayersRef.current.add(iframe)
          ytCommand(iframe, "pauseVideo")
          ytCommand(iframe, "seekTo", [0, true])
        }
        return
      }

      if (typeof d.info.duration === "number" && d.info.duration > 0) {
        videoDurationRef.current = d.info.duration
        setVideoDuration(d.info.duration)
      }
      if (typeof d.info.currentTime === "number") {
        currentTimeRef.current = d.info.currentTime
        setVideoCurrentTime(d.info.currentTime)
        // Shorts loop. The shared player has no playlist for YouTube's own loop: start again just before the end, so
        // YouTube's end screen doesn't show (and at the end below, should the last report come too late)
        if (iframe === hostFrame() && videoDurationRef.current > 1 && d.info.currentTime > videoDurationRef.current - 0.3 && !isSeekingRef.current)
          ytCommand(iframe, "seekTo", [0, true])
      }
      if (typeof state === "number") {
        if (state === YT_PLAYING) {
          markPlaying(id, iframe)
          scheduleNeighbors(1500)
        }
        // Only a real pause after it has played. Unstarted/cued/ended are passing states while switching
        // or looping, and showed a "paused" short that was in fact starting.
        else if (state === YT_PAUSED && activePlayedRef.current) setIsPlaying(false)
        // It stopped to load: watch that it goes on
        else if (state === YT_BUFFERING && activePlayedRef.current) watchPlayback(id)
        else if (state === YT_ENDED && iframe === hostFrame() && !userPausedRef.current) {
          ytCommand(iframe, "seekTo", [0, true])
          ytCommand(iframe, "playVideo")
        }
      }
    }
    window.addEventListener("message", onYTMessage)
    return () => window.removeEventListener("message", onYTMessage)
  }, [startPlayer, scheduleNeighbors, muteAutomatically, markPlaying, watchPlayback])

  // The shared player: created with the opening short if no tap made it yet (before the effect below, which
  // attaches it); let go when leaving Shorts
  useEffect(() => {
    if (!hosted) return
    armHost(shortsData[currentIndexRef.current]?.videoId)
    return () => detachHost(hostTokenRef.current)
  }, [hosted])

  // Switching shorts: reset progress, pause the one that left, play the new one
  useEffect(() => {
    currentIndexRef.current = currentIndex
    const activeId = shortsData[currentIndex]?.id
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets player state for the new short; the same effect talks to the YouTube iframes
    setVideoCurrentTime(0)
    setVideoDuration(0)
    videoDurationRef.current = 0
    setIsPlaying(true)
    setStartedId(null)
    setIsSlow(false)
    setPlayIssue(null)
    userPausedRef.current = false
    activePlayedRef.current = false
    pressedPlayRef.current = false
    reloadedRef.current = null
    currentTimeRef.current = 0
    if (playWatchRef.current) clearTimeout(playWatchRef.current)
    if (hosted) {
      // The shared player moves to this short and loads it (keeping the sound if it has it)
      const frame = hostFrame()
      const box = activeId ? boxRefs.current.get(activeId) : undefined
      videoRefs.current.clear()
      if (!activeId || !frame || !box) return
      videoRefs.current.set(activeId, frame)
      playerStatesRef.current.delete(frame)
      playerErrorsRef.current.delete(frame)
      hostTokenRef.current = attachHost(box, "short")
      setHostVisible(false)
      hostLoad(shortsData[currentIndex].videoId, !isMutedRef.current)
      // Not ready yet: its onReady message starts it
      if (hostReady()) {
        if (!readyPlayersRef.current.has(frame)) {
          readyPlayersRef.current.add(frame)
          ytCommand(frame, "addEventListener", ["onAutoplayBlocked"])
        }
        // A tap may have started this short already (YouTube only reports changes, so take what it said)
        const info = hostInfo()
        if (hostShowing() === shortsData[currentIndex].videoId) {
          if (typeof info.duration === "number" && info.duration > 0) {
            videoDurationRef.current = info.duration
            setVideoDuration(info.duration)
          }
          if (info.playerState === YT_PLAYING) markPlaying(activeId, frame)
        }
        startPlayer(activeId)
      } else watchPlayback(activeId)
      return
    }
    videoRefs.current.forEach((iframe, id) => {
      if (id === activeId) return
      // Rewind it too, so it starts from the beginning if you scroll back
      const state = playerStatesRef.current.get(iframe)
      if (state === YT_PLAYING || state === YT_BUFFERING || state === YT_PAUSED) {
        ytCommand(iframe, "pauseVideo")
        ytCommand(iframe, "seekTo", [0, true])
      }
    })
    const iframe = activeId ? videoRefs.current.get(activeId) : undefined
    if (!activeId || !iframe) return
    if (playerErrorsRef.current.has(iframe)) {
      setIsPlaying(false)
      setPlayIssue({ id: activeId, kind: "unavailable" })
    } else if (readyPlayersRef.current.has(iframe)) startPlayer(activeId)
    else {
      // Not ready yet: its onReady message starts it. Ping again in case an earlier handshake gave up.
      registerPlayer(activeId)
      watchPlayback(activeId)
    }
  }, [currentIndex, startPlayer, registerPlayer, watchPlayback, markPlaying, hosted])

  // (The shared player is hidden on each switch above and shown with revealHost once the short plays.)
  // The volume and mute the visitor set before, on a video or a short, as on YouTube
  useEffect(() => {
    const sound = savedSound()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read from localStorage after hydration
    setVolume(sound.volume)
    if (sound.muted) setIsMuted(true)
  }, [])
  const toggleMute = () => {
    if (restoreSound()) return
    const unmute = isMuted || volume === 0
    if (unmute) allowHostSound()
    if (unmute && volume === 0) setVolume(50)
    setIsMuted(!unmute)
    saveSound({ muted: !unmute, volume: volume || 50 })
  }
  // Keep muted ref in sync and send postMessage when mute changes
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => {
    const activeShort = shortsData[currentIndex]
    const iframe = activeShort ? videoRefs.current.get(activeShort.id) : null
    if (!iframe?.contentWindow) return
    ytCommand(iframe, isMuted ? 'mute' : 'unMute')
  // Only reacts to this setting; switching shorts re-applies it in the currentIndex effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted])

  // Keep volume ref in sync and send postMessage when volume changes
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => {
    if (isMuted) return
    const activeShort = shortsData[currentIndex]
    const iframe = activeShort ? videoRefs.current.get(activeShort.id) : null
    if (!iframe?.contentWindow) return
    ytCommand(iframe, 'setVolume', [volume])
  // Only reacts to this setting; switching shorts re-applies it in the currentIndex effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume])

  const scrollToVideo = useCallback((i: number) => {
    const c = containerRef.current; if (!c) return
    const t = Math.max(0, Math.min(i, shortsData.length - 1))
    if (t === currentIndex) return
    const sectionH = (c.firstElementChild as HTMLElement)?.offsetHeight || c.clientHeight
    // Start the next short now (as YouTube does) rather than when the scroll animation ends;
    // the scroll handler leaves the index alone until this scroll is over
    scrollTargetRef.current = t
    setCurrentIndex(t)
    c.scrollTo({ top: t * sectionH, behavior: "smooth" })
  }, [currentIndex])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      if (activePanel && e.key === "Escape") { setActivePanel(null); return }
      if (typing) return
      if (activePanel || document.querySelector('[role="dialog"], [role="menu"]')) return
      if (e.key === "ArrowDown") { e.preventDefault(); scrollToVideo(currentIndex + 1) }
      if (e.key === "ArrowUp") { e.preventDefault(); scrollToVideo(currentIndex - 1) }
    }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [currentIndex, activePanel, scrollToVideo])

  // Likes are stored by YouTube id so they match the Liked videos list
  const toggleLike = (id: string) => {
    const s = shortsData.find((x) => x.id === id)
    if (!s) return
    if (isLikedShort(s.videoId)) { unlike(s.videoId); return }
    const item = savedItem(s.videoId, 0) // liked as of now
    if (item) like(item)
  }
  const toggleFullscreen = () => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    const isFull = !!(document.fullscreenElement || doc.webkitFullscreenElement)
    try {
      if (!isFull) {
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
        else { notify("Full screen isn't supported in this browser"); return }
        setIsFullscreen(true)
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
        else doc.webkitExitFullscreen?.()
        setIsFullscreen(false)
      }
    } catch {
      notify("Full screen isn't supported in this browser")
    }
  }

  // Captions (lib/captions): drawn by YouTube, in the short's upper part
  const playingId = startedId && startedId === currentShort?.id ? startedId : null
  const placeCaptions = useCallback((id: string, far: boolean) => {
    const frame = videoRefs.current.get(id)
    const box = boxRefs.current.get(id)
    if (!frame || !box) return null
    const b = box.getBoundingClientRect()
    const buttons = box.closest("section")?.querySelector("[data-mute-toggle]")?.getBoundingClientRect()
    // (held sideways the buttons are beside the video)
    const over = buttons && buttons.right > b.left && buttons.left < b.right
    return shortCaptionLayout(frame, box, { ratio: shortRatio(shortsData.find((s) => s.id === id)?.videoId ?? ""), head: over ? Math.round(buttons.bottom - b.top) + 2 : 4, far })
  }, [])
  useEffect(() => {
    if (!playingId) return
    const send = (commands: [string, unknown[]][]) => commands.forEach(([func, args]) => ytCommand(videoRefs.current.get(playingId), func, args))
    if (!captions || !captionChoice) return send([HIDE_CAPTIONS])
    let far = true
    const show = () => {
      const layout = placeCaptions(playingId, far)
      send([...showCaptionsCommands(captionChoice, layout), ...moveCaptionsCommands(videoRefs.current.get(playingId), layout)])
    }
    const place = () => send(moveCaptionsCommands(videoRefs.current.get(playingId), placeCaptions(playingId, far)))
    show()
    // Again a little later, and whenever YouTube's captions part says it has loaded (captionReport: a slow network); in
    // their place once the title and the buttons are in theirs
    const timers = [setTimeout(place, 600), setTimeout(show, 1200)]
    // (not a translation, which YouTube would fetch again)
    if (!captionChoice.to) timers.push(setTimeout(show, 3000))
    // After YouTube's note
    timers.push(setTimeout(() => { far = false; place() }, (captionChoice.to ? 1200 : 3000) + CAPTION_NOTE_MS))
    const box = boxRefs.current.get(playingId)
    const observer = new ResizeObserver(() => timers.push(setTimeout(place, 100), setTimeout(place, 600)))
    if (box) observer.observe(box)
    return () => {
      observer.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [playingId, captions, captionChoice, captionReport, placeCaptions])
  const toggleCaptions = () => {
    if (hasCaptions) setCaptionsOn(!captions)
  }
  // Playback speed: the same for the next shorts
  const [rate, setRate] = useState(1)
  const [speedOpen, setSpeedOpen] = useState(false)
  useEffect(() => {
    if (playingId) ytCommand(videoRefs.current.get(playingId), "setPlaybackRate", [rate])
  }, [playingId, rate])

  // Save = Watch Later (it holds both videos and shorts)
  const isShortSaved = (s: (typeof shortsData)[number]) => isInWatchLater(s.videoId)
  const toggleSaveShort = (s: (typeof shortsData)[number]) =>
    toggleWatchLater(savedItem(s.videoId, 0)!) // saved as of now
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    const onVideo = !(e.currentTarget instanceof HTMLButtonElement)
    if (onVideo) {
      // This tap turned the sound back on ("Tap to unmute"): don't also pause
      if (soundRestoringEventsRef.current.has(e.nativeEvent)) return
      // A tap that stops a swipe isn't meant as play/pause
      if (Date.now() - lastScrollAtRef.current < 250) return
    }
    const newPlaying = !isPlaying
    if (newPlaying && !isMuted) allowHostSound()
    setIsPlaying(newPlaying)
    userPausedRef.current = !newPlaying
    if (playFeedbackTimerRef.current) clearTimeout(playFeedbackTimerRef.current)
    setShowPlayFeedback(true)
    playFeedbackTimerRef.current = setTimeout(() => setShowPlayFeedback(false), 600)
    const activeShort = shortsData[currentIndex]
    if (!activeShort) return
    if (!newPlaying) ytCommand(videoRefs.current.get(activeShort.id), 'pauseVideo')
    else {
      if (!activePlayedRef.current) pressedPlayRef.current = true
      startPlayer(activeShort.id)
    }
  }

  // "Try again" on a short that didn't play: its player is loaded again (inside this tap, so it may play with sound)
  const retryPlay = () => {
    const activeShort = shortsData[currentIndex]
    if (!activeShort || !navigator.onLine) return
    if (!isMuted) allowHostSound()
    const iframe = videoRefs.current.get(activeShort.id)
    if (iframe) playerErrorsRef.current.delete(iframe)
    setPlayIssue(null)
    setIsPlaying(true)
    setIsSlow(true)
    userPausedRef.current = false
    pressedPlayRef.current = true
    reloadPlayer(activeShort.id)
    watchPlayback(activeShort.id)
  }

  // The connection is back: the short on screen goes on, and the others' players, which couldn't load, load again
  const goOnRef = useRef(() => {})
  useEffect(() => {
    goOnRef.current = () => {
      const broken = shortsData.filter((s, i) => i !== currentIndex && videoRefs.current.get(s.id)?.isConnected && !readyPlayersRef.current.has(videoRefs.current.get(s.id)!))
      if (broken.length) setPlayerLoads((loads) => ({ ...loads, ...Object.fromEntries(broken.map((s) => [s.id, (loads[s.id] ?? 0) + 1])) }))
      if (playIssue?.kind === "offline") retryPlay()
    }
  })
  useEffect(() => onBackOnline(() => goOnRef.current()), [])

  // ---- COMMENT ACTIONS ----
  const persistComments = () => saveComments(commentsByVideo)

  const handleAddComment = () => {
    if (!commentText.trim()) return
    const nc = { id: `${currentShort.id}c${Date.now()}`, user: "You", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "Just now", content: commentText.trim(), likes: 0, dislikes: 0, replies: [] }
    setComments(p => [nc, ...p]); setCommentText("")
    if (commentsByVideo[currentShort.id]) commentsByVideo[currentShort.id].unshift(nc)
    else commentsByVideo[currentShort.id] = [nc]
    persistComments()
  }

  const handleLikeComment = (commentId: string) => {
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (!src) return
    const wasLiked = likedIds.includes(commentId)
    const wasDisliked = dislikedIds.includes(commentId)

    if (wasLiked) src.likes--
    else { src.likes++; if (wasDisliked) { src.dislikes--; setDislikedIds(p => p.filter(id => id !== commentId)) } }

    if (wasLiked) setLikedIds(p => p.filter(id => id !== commentId))
    else setLikedIds(p => [...p, commentId])

    setComments(p => p.map(c => c.id === commentId ? { ...c, likes: src.likes, _isLiked: !wasLiked, _isDisliked: false, dislikes: wasDisliked ? c.dislikes - 1 : c.dislikes } : c))
    persistComments()
  }

  const handleDislikeComment = (commentId: string) => {
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (!src) return
    const wasDisliked = dislikedIds.includes(commentId)
    const wasLiked = likedIds.includes(commentId)

    if (wasDisliked) src.dislikes--
    else { src.dislikes++; if (wasLiked) { src.likes--; setLikedIds(p => p.filter(id => id !== commentId)) } }

    if (wasDisliked) setDislikedIds(p => p.filter(id => id !== commentId))
    else setDislikedIds(p => [...p, commentId])

    setComments(p => p.map(c => c.id === commentId ? { ...c, dislikes: src.dislikes, _isDisliked: !wasDisliked, _isLiked: false, likes: wasLiked ? c.likes - 1 : c.likes } : c))
    persistComments()
  }

  const handleReplyComment = (commentId: string, text: string) => {
    const nr = { id: `r${Date.now()}`, user: "You", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "Just now", content: text, likes: 0, dislikes: 0, replies: [], parentId: commentId }
    setComments(p => p.map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), nr] } : c))
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (src) { if (!src.replies) src.replies = []; src.replies.push(nr); persistComments() }
  }

  const handleLikeReply = (commentId: string, replyId: string) => {
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (!src?.replies) return
    const reply = src.replies.find((r: CommentReply) => r.id === replyId)
    if (!reply) return
    const wasLiked = likedIds.includes(replyId)
    const wasDisliked = dislikedIds.includes(replyId)

    if (wasLiked) reply.likes--
    else { reply.likes++; if (wasDisliked) { reply.dislikes--; setDislikedIds(p => p.filter(id => id !== replyId)) } }

    if (wasLiked) setLikedIds(p => p.filter(id => id !== replyId))
    else setLikedIds(p => [...p, replyId])

    setComments(p => p.map(c => c.id === commentId ? { ...c, replies: (c.replies || []).map((r: CommentReply) => r.id === replyId ? { ...r, likes: reply.likes, _isLiked: !wasLiked, _isDisliked: false, dislikes: wasDisliked ? r.dislikes - 1 : r.dislikes } : r) } : c))
    persistComments()
  }

  const handleDislikeReply = (commentId: string, replyId: string) => {
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (!src?.replies) return
    const reply = src.replies.find((r: CommentReply) => r.id === replyId)
    if (!reply) return
    const wasDisliked = dislikedIds.includes(replyId)
    const wasLiked = likedIds.includes(replyId)

    if (wasDisliked) reply.dislikes--
    else { reply.dislikes++; if (wasLiked) { reply.likes--; setLikedIds(p => p.filter(id => id !== replyId)) } }

    if (wasDisliked) setDislikedIds(p => p.filter(id => id !== replyId))
    else setDislikedIds(p => [...p, replyId])

    setComments(p => p.map(c => c.id === commentId ? { ...c, replies: (c.replies || []).map((r: CommentReply) => r.id === replyId ? { ...r, dislikes: reply.dislikes, _isDisliked: !wasDisliked, _isLiked: false, likes: wasLiked ? r.likes - 1 : r.likes } : r) } : c))
    persistComments()
  }

  const handleReplyNested = (commentId: string, replyId: string, text: string) => {
    const nr = { id: `nr${Date.now()}`, user: "You", avatar: "/placeholder.svg?height=32&width=32", timeAgo: "Just now", content: text, likes: 0, dislikes: 0, parentId: replyId }
    setComments(p => p.map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), nr] } : c))
    const src = commentsByVideo[currentShort.id]?.find((c: VideoComment) => c.id === commentId)
    if (src) { if (!src.replies) src.replies = []; src.replies.push(nr); persistComments() }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment() } }
  const openPanel = (type: PanelType) => { if (activePanel === type) { setActivePanel(null); return }; setActivePanel(type); setLastPanel(type); setDescExpanded(false); if (type === "comments") { loadCommentsForCurrentShort(); if (isSidePanel) setTimeout(() => commentInputRef.current?.focus(), 400) } else if (type === "description") loadDescriptionForCurrentShort() }
  type PanelType = "comments" | "description" | null
  const panel = activePanel ?? lastPanel
  const panelTitle = panel === "comments" ? "Comments" : panel === "description" ? "Description" : ""
  const panelWidth = isWideViewport ? 480 : 380
  // Room for the up/down buttons beside it, which step aside on smaller screens
  const panelRight = isRoomy ? 96 : 24
  const feedRight = activePanel && isSidePanel ? panelWidth + 20 + panelRight : 0

  const currentComments2 = commentsByVideo[currentShort?.id] || []
  const totalCommentsCount = currentComments2.length + currentComments2.reduce((acc: number, c: VideoComment) => acc + (c.replies?.length || 0), 0)

  // Comments or description, in the panel or in the sheet
  const panelBody = (
    <>
      {panel === "comments" && (
        <>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 yt-scrollbar">
            {commentsLoading ? (
              <><CommentSkeleton /><CommentSkeleton /><CommentSkeleton /><CommentSkeleton /><CommentSkeleton /></>
            ) : comments.length > 0 ? (
              comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  onLikeComment={handleLikeComment}
                  onDislikeComment={handleDislikeComment}
                  onReplyComment={handleReplyComment}
                  onLikeReply={handleLikeReply}
                  onDislikeReply={handleDislikeReply}
                  onReplyNested={handleReplyNested}
                />
              ))
            ) : (
              <div className="flex min-h-32 items-center justify-center h-full"><p className="text-muted-foreground text-sm">No comments yet</p></div>
            )}
          </div>
          <div className="border-t border-border px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback className="bg-muted text-foreground text-xs">Y</AvatarFallback></Avatar>
              <div className="flex-1 flex items-center gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 bg-transparent border-b border-border pb-1 text-base text-foreground md:text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                />
                <button aria-label="Post comment" onClick={handleAddComment} disabled={!commentText.trim()} className="text-primary hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed p-1">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {panel === "description" && (
        <>
          {descLoading ? (
            <DescriptionSkeleton />
          ) : currentShort ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden yt-scrollbar">
              <div className="px-4 py-3"><h4 className="text-foreground text-base font-semibold leading-snug [overflow-wrap:anywhere]">{currentShort.title}</h4></div>
              <div className="px-4 pb-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm"><Eye className="h-4 w-4" /><span>{currentShort.views} views</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm"><Clock className="h-4 w-4" /><span>{currentShort.timeAgo}</span></div>
              </div>
              <div className="px-4 pb-4">
                <DescriptionText text={currentShort.description} className={cn("text-sm text-foreground leading-relaxed", !descExpanded && "line-clamp-4")} />
                {currentShort.description && currentShort.description.length > 200 && <button onClick={() => setDescExpanded(!descExpanded)} className="text-muted-foreground hover:text-foreground text-xs mt-1 font-medium">{descExpanded ? 'Show less' : '...more'}</button>}
              </div>
              <div className="px-4 pb-4 flex flex-wrap gap-x-2 gap-y-1">{currentShort.hashtags.map((tag: string) => <Link key={tag} href={hashtagHref(tag)} className="text-[#065fd4] dark:text-[#3ea6ff] text-sm [overflow-wrap:anywhere]">{tag}</Link>)}</div>
            </div>
          ) : (
            <div className="flex min-h-32 items-center justify-center h-full"><p className="text-muted-foreground text-sm">No description available</p></div>
          )}
        </>
      )}
    </>
  )
  const closePanel = () => setActivePanel(null)

  return (
    <div className="bg-background">
      <h1 className="sr-only">Shorts</h1>
      <style>{`
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes playFeedback { 0% { opacity: 0.9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.6); } }
        .animate-fade-in-left { animation: fadeInLeft 0.3s ease-out forwards; }
        .animate-play-feedback { animation: playFeedback 0.55s ease-out forwards; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        /* Mobile: the 9:16 player and cover cover the whole box (cropping the overflow), so there are no black
           bars at the sides when the screen is wider than 9:16, which it is on most phones once the nav bar is
           counted. Pure CSS, so it's right in the server's HTML too (sized in JS, the cover showed at the screen's
           shape until the page's script ran, then jumped). Exact with container query units; browsers without
           them (Safari before 16: every iPhone 7, 6s and first SE; Chrome before 105) work it out from the
           screen, which the feed fills above the 56px nav (dvh where known, else vh, which is a little taller:
           a little more cropped, never smaller). Their old fallback was a box of the screen's shape, which showed
           the short small with black sides until it played, then seemed to zoom in.
           The player is 120px taller at the top and bottom than its video, which it centres: YouTube's title, logo and
           buttons, there for a short's first seconds, are in those bands, outside the box (as on the watch pages) */
        @media (max-width: 767px) {
          .shorts-video-iframe, .shorts-poster {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: max(100vw, calc((100vh - 56px - env(safe-area-inset-bottom, 0px)) * 9 / 16));
            width: max(100vw, calc((100dvh - 56px - env(safe-area-inset-bottom, 0px)) * 9 / 16));
            height: max(calc(100vh - 56px - env(safe-area-inset-bottom, 0px)), calc(100vw * 16 / 9));
            height: max(calc(100dvh - 56px - env(safe-area-inset-bottom, 0px)), calc(100vw * 16 / 9));
          }
          .shorts-video-iframe {
            height: calc(max(100vh - 56px - env(safe-area-inset-bottom, 0px), 100vw * 16 / 9) + 240px);
            height: calc(max(100dvh - 56px - env(safe-area-inset-bottom, 0px), 100vw * 16 / 9) + 240px);
          }
          @media (orientation: landscape) and (max-height: 560px) {
            .shorts-video-iframe, .shorts-poster { width: 100%; height: 100%; }
            .shorts-video-iframe { height: calc(100% + 240px); }
          }
          @supports (width: 1cqw) {
            .shorts-player-box { container-type: size; }
            .shorts-video-iframe, .shorts-poster {
              width: max(100cqw, 100cqh * 9 / 16);
              height: max(100cqh, 100cqw * 16 / 9);
            }
            .shorts-video-iframe { height: calc(max(100cqh, 100cqw * 16 / 9) + 240px); }
          }
        }
        /* Desktop: the container is already 9:16 */
        @media (min-width: 768px) {
          .shorts-video-iframe, .shorts-poster {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          .shorts-video-iframe { top: -120px; height: calc(100% + 240px); }
        }
      `}</style>

      <CaptionsDialog open={captionsOpen} onOpenChange={setCaptionsOpen} tracks={captionTracks} choice={captionChoice} on={captions} reported={captionReport} />
      <ResponsiveDialog open={speedOpen} onOpenChange={setSpeedOpen} title="Playback speed" className="max-w-[320px]">
        <div role="radiogroup" aria-label="Playback speed" className="yt-scrollbar min-h-0 overflow-y-auto pb-2">
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
            <button key={r} type="button" role="radio" aria-checked={rate === r} onClick={() => { setRate(r); setSpeedOpen(false) }} className="flex h-11 w-full items-center gap-4 px-4 text-left text-[15px] transition-colors hover:bg-accent active:bg-accent md:h-10 md:rounded-lg md:text-sm">
              <Check className={cn("h-5 w-5 flex-shrink-0", rate !== r && "invisible")} />
              {r === 1 ? "Normal" : r}
            </button>
          ))}
        </div>
      </ResponsiveDialog>

      {/* Up/down buttons from lg up; on narrower screens they would cover the video (swipe/keys still work) */}
      <div className={cn("hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col gap-4", activePanel && isSidePanel && !isRoomy && "lg:hidden")}>
        <button aria-label="Previous short" onClick={() => scrollToVideo(currentIndex - 1)} disabled={currentIndex === 0} className="w-14 h-14 rounded-full flex items-center justify-center bg-secondary text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><ChevronUp className="h-7 w-7" /></button>
        <button aria-label="Next short" onClick={() => scrollToVideo(currentIndex + 1)} disabled={currentIndex === shortsData.length - 1} className="w-14 h-14 rounded-full flex items-center justify-center bg-secondary text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><ChevronDown className="h-7 w-7" /></button>
      </div>

      {/* Beside the video */}
      {activePanel && isSidePanel && (
        <div className="fixed top-[56px] bottom-0 z-40 flex items-center" style={{ right: `${panelRight}px` }}>
          <div className="bg-card dark:bg-[#212121] border border-border dark:border-transparent rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-fade-in-left h-[85vh]" style={{ width: `${panelWidth}px` }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-foreground text-xl font-bold">{panelTitle}</h2>
                {panel === "comments" && <span className="text-muted-foreground text-base">{totalCommentsCount}</span>}
              </div>
              <button aria-label="Close" onClick={closePanel} className="h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:bg-muted">
                <X className="h-6 w-6" />
              </button>
            </div>
            {panelBody}
          </div>
        </div>
      )}

      {/* Phones, tablets and low windows: the app's sheet */}
      <Drawer open={!!activePanel && !isSidePanel} onOpenChange={(open) => { if (!open) closePanel() }}>
        <DrawerContent accessibleTitle={null} className="max-h-[70dvh] md:mx-auto md:max-w-[640px] low:max-h-[85dvh]">
          <DrawerTitleBar title={panelTitle} count={panel === "comments" ? totalCommentsCount : undefined} />
          {panelBody}
        </DrawerContent>
      </Drawer>


      {/* The shared player (iPhone, iPad, Safari) lives under the feed, which is see-through where the short on
          screen plays; black behind it on phones, as the feed is */}
      {hosted && <div className="fixed inset-0 bg-black low:bg-background md:hidden" aria-hidden="true" />}

      {/* Main Shorts Content */}
      <div
        ref={containerRef}
        // overflow-x-hidden + touch-pan-y: the feed only moves up and down (the hidden action rails of the other
        // shorts slide in from the right and must not make it pannable sideways)
        className={cn(hosted && "z-[2]", "fixed inset-0 top-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] md:top-[56px] md:bottom-0 overflow-y-scroll overflow-x-hidden touch-pan-y snap-y snap-mandatory overscroll-contain scrollbar-none transition-all duration-300 ease-in-out")}
        style={{
          scrollSnapType: "y mandatory",
          left: isDesktopViewport ? `calc(${desktopSidebarWidth}px + var(--sal))` : "0px",
          right: `${feedRight}px`,
          // The feed's width, which a short with its actions beside it stays within (on windows narrower than they are tall)
          "--feed-w": `calc(100vw - ${(isDesktopViewport ? desktopSidebarWidth : 0) + feedRight}px)`,
        } as React.CSSProperties}
      >
        {/* Refs below are only used inside event handlers and ref callbacks, never read while rendering */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {shortsData.map((short, index) => {
          const isActive = index === currentIndex
          const isHovered = hoveredVideoId === short.id
          // The active short and its neighbours get a live player; the rest only show a thumbnail
          // (With the shared player, no short has a player of its own)
          const hasPlayer = !hosted && (isActive || (preloadNeighbors && Math.abs(index - currentIndex) <= PRELOAD_RANGE))
          const posterHidden = isActive && startedId === short.id
          // The shared player shows through this short's box (it sits under the feed, see below)
          const seeThrough = hosted && posterHidden
          const liked = isLikedShort(short.videoId)
          const saved = isShortSaved(short)
          return (
            <section key={short.id} className={cn("relative h-full md:h-[calc(100%-32px)] w-full overflow-x-clip snap-start snap-always flex items-center md:items-start justify-center", !seeThrough && "bg-background")}>
              {/* The video plus its action rail: side by side from lg up; on smaller screens the rail sits over the video */}
              <div className="relative w-full h-full low:h-[calc(100%-16px)] low:w-auto md:w-auto md:h-[min(calc(100%-12px),calc((var(--feed-w)-24px)*16/9))] md:mt-2 lg:h-[min(calc(100%-12px),calc((var(--feed-w)-88px)*16/9))] flex items-end lg:gap-4">
                <div
                  className={cn("relative w-full h-full low:aspect-[9/16] low:w-auto low:flex-shrink-0 low:rounded-2xl low:!overflow-visible md:w-auto md:flex-shrink-0 md:aspect-[9/16] md:rounded-2xl md:overflow-hidden", !seeThrough && "bg-black")}
                  onMouseEnter={() => setHoveredVideoId(short.id)}
                  onMouseLeave={() => { setHoveredVideoId(null); setShowVolumeSlider(false) }}
                >
                  {/* Video Player — overflow-hidden only here so the progress bar scrubber isn't clipped */}
                  {/* Tapping a short that isn't the active one (e.g. the next one peeking in) moves to it */}
                  <div
                    ref={(el) => {
                      if (el) boxRefs.current.set(short.id, el)
                      else boxRefs.current.delete(short.id)
                    }}
                    className={cn("shorts-player-box absolute inset-0 overflow-hidden low:rounded-2xl md:rounded-2xl", !seeThrough && "bg-black")}
                    onClick={isActive ? handleTogglePlay : () => scrollToVideo(index)}
                  >
                    {hasPlayer && (
                      <iframe
                        key={playerLoads[short.id] ?? 0}
                        ref={(el) => {
                          if (el) videoRefs.current.set(short.id, el)
                        }}
                        // Never change this src after mount (that reloads the player): playback is started and
                        // stopped with postMessage commands, so neighbours can load ahead of time paused.
                        // (A player that got stuck is replaced by a new one: its key, see reloadPlayer)
                        src={`https://www.youtube.com/embed/${short.videoId}?autoplay=0&mute=0&controls=0&loop=1&playlist=${short.videoId}&modestbranding=1&rel=0&fs=1&playsinline=1&enablejsapi=1`}
                        title={short.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        tabIndex={isActive ? 0 : -1}
                        // Invisible until it plays (the thumbnail covers it anyway): YouTube's player resizes its
                        // video while loading, which otherwise counts as layout shift for the page
                        className={cn("shorts-video-iframe transition-opacity duration-200", posterHidden ? "opacity-100" : "opacity-0")}
                        onLoad={() => registerPlayer(short.id)}
                      />
                    )}
                    {/* The video's first frame on top of the player until it's actually playing, so switching never shows
                        a black frame and nothing changes when the video takes over (ShortCover). In the same 9:16 box
                        that covers this one as the video (.shorts-poster), so it's framed exactly like the video */}
                    <div className={cn("absolute inset-0 pointer-events-none transition-opacity duration-200", posterHidden ? "opacity-0" : "opacity-100")}>
                      <div className="shorts-poster">
                        {/* The opening short's cover is the main image until its player starts, so only it loads early */}
                        <ShortCover videoId={short.videoId} thumbnail={youtubeThumb(short.videoId)} title={short.title} priority={index === initialIndex} />
                      </div>
                    </div>
                  </div>

                  {/* Transparent click overlay — above iframe (z-0) but below controls (z-20+) */}
                  {isActive && (
                    <div
                      className="absolute inset-0 z-10 cursor-pointer"
                      onClick={(e) => handleTogglePlay(e as unknown as React.MouseEvent)}
                    />
                  )}

                  {/* It's loading, or got stuck: never just a still picture */}
                  {isActive && isSlow && isPlaying && !playIssue && (
                    <div role="status" aria-label="Loading" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                      <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-white" />
                    </div>
                  )}
                  {/* Phones: the play icon while paused, as in YouTube's app (on desktop it's the button at the top) */}
                  {isActive && !isPlaying && !playIssue && !showPlayFeedback && (
                    <div aria-hidden="true" data-paused-icon className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center md:hidden">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40"><Play className="h-8 w-8 fill-white text-white" /></span>
                    </div>
                  )}
                  {isActive && playIssue?.id === short.id && (
                    <div role="alert" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 px-8 low:px-2 low:gap-2 text-center text-white low:rounded-2xl md:rounded-2xl">
                      <p className="text-base font-medium">{playIssue.kind === "unavailable" ? "This short isn't available" : playIssue.kind === "offline" ? "You're offline" : "This short isn't playing"}</p>
                      <p className="max-w-xs text-sm text-white/80">
                        {playIssue.kind === "unavailable" ? "It may have been removed from YouTube." : playIssue.kind === "offline" ? "Check your connection." : "Check your connection, then try again."}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {playIssue.kind !== "unavailable" && (
                          <button type="button" onClick={retryPlay} className="h-9 rounded-full bg-white px-4 text-sm font-medium text-black hover:bg-white/90 active:bg-white/80">Try again</button>
                        )}
                        {index < shortsData.length - 1 && playIssue.kind !== "offline" && (
                          <button type="button" onClick={() => scrollToVideo(index + 1)} className="h-9 rounded-full bg-white/20 px-4 text-sm font-medium text-white hover:bg-white/30 active:bg-white/30">Next short</button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Play/pause tap feedback animation */}
                  {isActive && showPlayFeedback && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-play-feedback">
                        {isPlaying
                          ? <Pause className="h-7 w-7 text-white" />
                          : <Play className="h-7 w-7 text-white fill-white" />}
                      </div>
                    </div>
                  )}

                  {/* Gradient overlays */}
                  <div data-short-shade="" className={cn("absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none low:rounded-b-2xl")} />
                  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none low:hidden" />

                  {/* Top controls (hover only) */}
                  {/* Only the control row takes clicks; the padded area below it must not cover the action rail on short windows */}
                  <div className={`absolute top-0 left-0 right-0 z-30 px-4 pt-4 pb-16 low:p-0 transition-opacity duration-200 pointer-events-none ${(isHovered || isActive) && !isScrolling ? "opacity-100 [&>*]:pointer-events-auto" : "opacity-0"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 low:absolute low:right-full low:top-0 low:mr-3 low:flex-col">
                        {/* Mobile: back button in play/pause slot */}
                        <button type="button" onClick={back} className={cn(topButtonClass, "flex md:hidden")} aria-label="Go back">
                          <ArrowLeft className="h-6 w-6" />
                        </button>
                        {/* Desktop: play/pause */}
                        <button type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={handleTogglePlay} className={cn(topButtonClass, "hidden md:flex")}>
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </button>
                        <div className="relative flex items-center" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                          <button type="button" data-mute-toggle aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"} onClick={toggleMute} className={cn(topButtonClass, "flex")}>
                            {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          </button>
                          {showVolumeSlider && (
                            <div className="hidden md:flex low:!hidden items-center rounded-full px-3 py-2 ml-1 shadow-lg" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                              <input type="range" aria-label="Volume" min="0" max="100" value={isMuted ? 0 : volume} onChange={(e) => { const v = Number(e.target.value); setVolume(v); autoMutedRef.current = false; setAutoMuted(false); setIsMuted(false); saveSound({ volume: v, muted: v === 0 }) }} className="w-20 h-1 accent-white cursor-pointer" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 low:absolute low:left-full low:top-0 low:ml-3">
                        <button
                          type="button"
                          aria-label={!hasCaptions ? "Captions unavailable" : captions ? "Turn off captions" : "Turn on captions"}
                          aria-pressed={hasCaptions ? captions : undefined}
                          disabled={!hasCaptions}
                          onClick={toggleCaptions}
                          className={cn(topButtonClass, "flex [&:disabled_svg]:opacity-40")}
                        >
                          {captions ? <CCIconOn className="h-5 w-5" /> : <CCIconOff className="h-5 w-5" />}
                        </button>
                        <button type="button" aria-label="Full screen" onClick={toggleFullscreen} className={cn(topButtonClass, "flex")}>
                          <FullscreenIcon className="h-5 w-5" />
                        </button>
                        <ActionMenu
                          title="Short actions"
                          actions={[
                            { id: "description", label: "Description", icon: List, onSelect: () => openPanel("description") },
                            ...(hasCaptions ? [{ id: "captions", label: "Captions", icon: captions ? CCIconOn : CCIconOff, value: captions && captionChoice ? captionChoice.to?.name ?? languageName(captionChoice.track.code) : "Off", opens: true, onSelect: () => setCaptionsOpen(true) }] : []),
                            { id: "speed", label: "Playback speed", icon: Gauge, value: rate === 1 ? "Normal" : `${rate}x`, opens: true, onSelect: () => setSpeedOpen(true) },
                            { id: "watch-later", label: isShortSaved(short) ? "Remove from Watch later" : "Save to Watch later", icon: Clock, divider: true, onSelect: () => toggleSaveShort(short) },
                            { id: "playlist", label: "Save to playlist", icon: SaveIcon, opens: true, onSelect: () => openSaveCard(short) },
                            { id: "share", label: "Share", icon: ShareIcon, opens: true, onSelect: () => openShare(`/shorts/${short.videoId}`, short.title, youtubeThumb(short.videoId)) },
                            { id: "dont-recommend", label: "Don't recommend channel", icon: UserX, divider: true, onSelect: () => dontRecommend(short.channelId, short.channel) },
                            { id: "report", label: "Report", icon: Flag, opens: true, onSelect: () => openReport("short", short.title) },
                            { id: "feedback", label: "Send feedback", icon: MessageSquare, opens: true, onSelect: openFeedback },
                          ]}
                          trigger={
                            <button type="button" aria-label="More options" className={cn(topButtonClass, "flex")}>
                              <MoreVertIcon className="h-5 w-5 md:h-6 md:w-6" />
                            </button>
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Muted because the browser didn't allow sound yet: one tap brings it back (as on YouTube) */}
                  {isActive && autoMuted && !isScrolling && (
                    <button
                      type="button"
                      data-mute-toggle
                      onClick={(e) => { e.stopPropagation(); restoreSound() }}
                      className="absolute left-1/2 top-[200px] supports-[width:1cqw]:top-[calc(66px+37.5cqw)] z-30 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/60 px-4 py-2 text-sm font-medium low:!top-2 low:px-3 low:text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                    >
                      <VolumeX className="h-5 w-5" />
                      <span className="md:hidden">Tap to unmute</span>
                      <span className="hidden md:inline">Click to unmute</span>
                    </button>
                  )}

                  {/* Bottom info (phones: the title ends 19px above the bottom, 16px above the progress bar, on every size, as on
                      YouTube's mobile site) */}
                  <div data-short-info="" className={cn(`absolute bottom-[19px] md:bottom-6 low:!bottom-3 left-4 right-20 lg:right-4 low:left-3 low:!right-3 z-20 transition-all duration-500 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] ${isActive && !isScrolling ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`)}>
                    <div className="flex items-center gap-2.5 mb-2 low:gap-2 low:mb-1">
                      <Avatar className="h-9 w-9 flex-shrink-0 low:h-7 low:w-7">
                        <AvatarImage src={short.channelAvatar} />
                        <AvatarFallback className="bg-muted text-foreground text-sm">{short.channel.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-white font-medium text-[15px] low:text-[13px] truncate">{short.channel}</span>
                    </div>
                    <button type="button" onClick={() => openPanel("description")} className="block w-full text-left">
                      <p className="text-white text-[15px] low:text-[13px] leading-snug line-clamp-2 [overflow-wrap:anywhere]">{short.title}</p>
                    </button>
                  </div>

                  {/* YouTube-style progress bar with scrubber */}
                  {isActive && (() => {
                    const fillPct = videoDuration > 0 ? Math.min(100, (videoCurrentTime / videoDuration) * 100) : 0
                    const showScrubber = isProgressHovered
                    return (
                      /* Outer div: tall transparent hit area on mobile (24px), auto on desktop */
                      <div
                        className="absolute bottom-0 left-0 right-0 low:left-3 low:right-3 z-40 cursor-pointer flex flex-col justify-end h-6 md:h-auto"
                        onMouseEnter={() => setIsProgressHovered(true)}
                        onMouseLeave={() => { setIsProgressHovered(false) }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          isSeekingRef.current = true; setIsSeeking(true)
                          const bar = e.currentTarget
                          const doSeek = (clientX: number) => {
                            const rect = bar.getBoundingClientRect()
                            const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
                            const t = pct * videoDurationRef.current
                            setVideoCurrentTime(t)
                            const iframe = videoRefs.current.get(short.id)
                            ytCommand(iframe, 'seekTo', [t, true])
                          }
                          doSeek(e.clientX)
                          const onMove = (ev: MouseEvent) => doSeek(ev.clientX)
                          const onUp = () => {
                            isSeekingRef.current = false; setIsSeeking(false)
                            window.removeEventListener('mousemove', onMove)
                            window.removeEventListener('mouseup', onUp)
                          }
                          window.addEventListener('mousemove', onMove)
                          window.addEventListener('mouseup', onUp)
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation()
                          isSeekingRef.current = true; setIsSeeking(true)
                          setIsProgressTouch(true)
                          const touch = e.touches[0]; if (!touch) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
                          const t = pct * videoDurationRef.current
                          setVideoCurrentTime(t)
                          const iframe = videoRefs.current.get(short.id)
                          ytCommand(iframe, 'seekTo', [t, true])
                        }}
                        onTouchMove={(e) => {
                          e.stopPropagation()
                          const touch = e.touches[0]; if (!touch) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
                          const t = pct * videoDurationRef.current
                          setVideoCurrentTime(t)
                          const iframe = videoRefs.current.get(short.id)
                          ytCommand(iframe, 'seekTo', [t, true])
                        }}
                        onTouchEnd={() => { isSeekingRef.current = false; setIsSeeking(false); setIsProgressTouch(false) }}
                      >
                        {/* Visual track — scrubber centers on this div so it's always correctly positioned */}
                        <div
                          className={`relative w-full transition-[height] duration-150 ${showScrubber ? 'h-[5px]' : 'h-[3px]'}`}
                          style={{ background: 'rgba(255,255,255,0.25)' }}
                        >
                          {/* Red fill — no transition during seeking so it tracks cursor immediately */}
                          <div
                            className="h-full bg-red-500 pointer-events-none"
                            style={{
                              width: `${fillPct}%`,
                              transition: isSeeking ? 'none' : 'width 0.25s linear',
                            }}
                          />
                          {/* Scrubber — centered on the visual track, visible on hover/touch */}
                          {showScrubber && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-md pointer-events-none"
                              style={{ left: `${fillPct}%` }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
                {/* Actions: over the video on phones/tablets, beside it on wider screens (as on YouTube) */}
                <div data-short-actions="" className={cn(
                  // Phones/tablets: ends 27px above the bottom, as on YouTube; the gaps follow the screen's height (see actionCircleClass)
                  "absolute right-3 bottom-[27px] z-20 flex flex-col items-center gap-[clamp(6px,2.2svh,20px)] transition-all duration-500",
                  "lg:static lg:z-auto lg:flex-shrink-0 lg:gap-4 lg:mb-1",
                  // Phones held sideways: beside the video, in two rows
                  "low:!absolute low:left-full low:right-auto low:bottom-0 low:!mb-0 low:ml-3 low:grid low:w-max low:grid-cols-[repeat(3,max-content)] low:justify-items-center low:!gap-x-3 low:!gap-y-1.5",
                  isActive && !isScrolling ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
                )}>
                  <button type="button" aria-label={`${liked ? "Unlike" : "Like"}, ${short.likes}`} aria-pressed={liked} onClick={() => toggleLike(short.id)} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><Heart className={cn("h-6 w-6", liked && "text-red-500 fill-red-500")} /></span>
                    <span className={actionLabelClass}>{short.likes}</span>
                  </button>
                  {/* Comments: switched off for now. To bring it back, uncomment this, import MessageCircle from lucide-react again
                      and take `.skip` off "Shorts comments" in e2e/screen-sizes.spec.ts
                  <button type="button" aria-label={`Comments, ${short.comments}`} onClick={() => openPanel("comments")} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><MessageCircle className="h-6 w-6" /></span>
                    <span className={actionLabelClass}>{short.comments}</span>
                  </button>
                  */}
                  <button type="button" onClick={() => openShare(`/shorts/${short.videoId}`, short.title, youtubeThumb(short.videoId))} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><ShareIcon className="h-6 w-6" /></span>
                    <span className={actionLabelClass}>Share</span>
                  </button>
                  <button type="button" aria-pressed={saved} onClick={() => toggleSaveShort(short)} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><SaveIcon filled={saved} className="h-6 w-6" /></span>
                    <span className={actionLabelClass}>{saved ? "Saved" : "Save"}</span>
                  </button>
                  <button type="button" onClick={() => openReport("short", short.title)} className="flex flex-col items-center gap-1 group">
                    <span className={actionCircleClass}><Flag className="h-6 w-6" /></span>
                    <span className={actionLabelClass}>Report</span>
                  </button>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

// useSearchParams() needs a Suspense boundary so the page can be prerendered
export default function ShortsPage() {
  return (
    <Suspense fallback={null}>
      <ShortsPageContent />
    </Suspense>
  )
}
