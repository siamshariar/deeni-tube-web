// app/channels/[slug]/page.tsx
"use client";

import { playPlaylistFromTap } from "@/lib/play-playlist";
import { useState, useEffect, useMemo } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
    Ban,
  Flag,
  ListVideo,
  Play,
  Clock,
  } from "lucide-react";
import { SaveIcon, ShareIcon } from "@/components/icons/action-icons";
import ShortCard from "@/components/short-card";
import { youtubeThumb } from "@/lib/media-lookup";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import VideoGrid from "@/components/video-grid";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { channelData, ChannelItem } from "@/lib/channel-data";
import { videoData, VideoItem } from "@/lib/video-data";
import { ShareModal } from "@/components/share-modal";
import { openSaveCard } from "@/lib/save-card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ReportDialog } from "@/components/report-dialog";
import { useWatchLater } from "@/hooks/useWatchLater";
import { extendedPlaylists, PlaylistItem } from "@/lib/playlist-data";

import { useDontRecommend } from "@/hooks/useDontRecommend";
import type { ChannelShort } from "@/lib/types";
import { DescriptionText } from "@/components/description-text";
// Mock shorts data - combine from shorts-data.ts and add more
const mockShortsByChannel: Record<string, ChannelShort[]> = {
  "monzur": [
    { id: "sh1", videoId: "MBxDbbkk0gQ", title: "একমাত্র আল্লাহর রাজত্বই চিরস্থায়ী", views: "15K", timeAgo: "2 weeks ago", duration: "0:58" },
    { id: "sh2", videoId: "goHfO28fE-A", title: "যারা বলে আমাদের রব আল্লাহ", views: "25K", timeAgo: "3 days ago", duration: "0:45" },
    { id: "sh3", videoId: "8YfQCDjlQsc", title: "ইমামের দূর্ব্যবহারের কারণে কেউ ওই মাসজিদে না গেলে কি অন্যায় হবে?", views: "50K", timeAgo: "1 week ago", duration: "0:51" },
    { id: "sh4", videoId: "o38RKuY_AUU", title: "সিদ্দীকে আকবার রা.-এর দৃষ্টিতে প্রিয় নবী সা.", views: "18K", timeAgo: "5 days ago", duration: "0:55" },
    { id: "sh5", videoId: "oEWnPbRvOrY", title: "আল্লাহর পক্ষ থেকে তাওফীক প্রাপ্তি", views: "22K", timeAgo: "3 weeks ago", duration: "0:50" },
  ],
  "abdullah-jahangir": [
    { id: "sh6", videoId: "PUwTf64igQk", title: "এভাবে ঈমান নষ্ট করছেন নাতো?", views: "35K", timeAgo: "4 days ago", duration: "0:52" },
    { id: "sh7", videoId: "hHpoYE-v6og", title: "রোগ-ব্যাধিতে ধৈর্য ধারণ করা", views: "28K", timeAgo: "1 week ago", duration: "0:42" },
    { id: "sh8", videoId: "Kk1_-T-8MFU", title: "মহান আল্লাহ'র কাছে চাওয়ার নিয়ম", views: "42K", timeAgo: "2 weeks ago", duration: "0:48" },
  ],
  "abu-bakar-zakariya": [
    { id: "sh9", videoId: "rTrh9VHgdwo", title: "ওজুতে ঘাড় মাসাহ করা সুন্নাহ নাকি বিদ'আত", views: "12K", timeAgo: "1 week ago", duration: "0:55" },
    { id: "sh10", videoId: "ihdO_G6Yk0E", title: "দুনিয়াতেই জান্নাত আছে আপনি কি জানেন? ✨", views: "28K", timeAgo: "3 days ago", duration: "0:50" },
  ],
  "imam-hossain": [
    { id: "sh11", videoId: "_zCnmnCd7CU", title: "আদমসুমারির খাতায় মুসলমান, বাস্তবে ইমানের খাতায় নাম নাই", views: "18K", timeAgo: "5 days ago", duration: "0:58" },
  ],
  "zakir-naik": [
    { id: "sh12", videoId: "Wgk2Hw5-m7Y", title: "The Quran is the Most Untranslatable Book - Dr Zakir Naik", views: "8K", timeAgo: "3 weeks ago", duration: "0:58" },
    { id: "sh19", videoId: "Qp4vZLEqizc", title: "Belief in Bad Omen is Shirk - Dr Zakir Naik", views: "4.6K", timeAgo: "2 weeks ago", duration: "1:13" },
  ],
  "mufti-menk": [
    { id: "sh13", videoId: "0m1Mc6dX8XY", title: "Seek The Forgiveness of Allah #muftimenk", views: "95K", timeAgo: "4 months ago", duration: "1:10" },
    { id: "sh14", videoId: "HKRq0DE-GTo", title: "Just Don't Get Angry #muftimenk", views: "127K", timeAgo: "1 month ago", duration: "1:00" },
  ],
  "assim-al-hakeem": [
    { id: "sh15", videoId: "Tnb74r4VZaY", title: "Is it not permissible 2 get married in Muharram?", views: "32K", timeAgo: "3 days ago", duration: "0:48" },
    { id: "sh16", videoId: "yLMQmr7qjcM", title: "Read all duas of morning & evening adhkar?", views: "25K", timeAgo: "1 week ago", duration: "0:50" },
  ],
  // Dr. Muhammad Saifullah's official channel has no Shorts
  "saifullah-madani": [],
};

function ChannelSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-14">
      <Skeleton className="w-full h-[100px] md:hidden" />
      <Skeleton className="w-full hidden md:block h-52 xl:h-64" />
      <div className="px-3 py-4 border-b">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 md:h-20 md:w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
      <div className="border-b px-3">
        <div className="flex gap-6 h-12 items-center">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="flex mt-2 gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChannelDetailPage() {
  const params = useParams();
  const channel = channelData.find((ch) => ch.slug === (params.slug as string));
  // The [slug] layout already returns a 404 for unknown channels; this is a safety net
  if (!channel) notFound();
  // Keyed so tabs and dialogs reset when moving between channels
  return <ChannelView key={channel.id} channel={channel} />;
}

function ChannelView({ channel }: { channel: ChannelItem }) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const dontRecommend = useDontRecommend();

  const channelVideos: VideoItem[] = videoData.filter(
    (v) => v.channelId === channel.id
  );

  const channelShorts = mockShortsByChannel[channel.id] || [];

  // Get playlists that contain videos from this channel
  const channelPlaylists = useMemo(() => {
    const channelVideoIds = channelVideos.map(v => v.id);
    // Only public playlists belong on a channel page (never the user's Watch Later / Liked)
    return extendedPlaylists.filter((pl) =>
      pl.isPublic && pl.videoIds.some(vid => channelVideoIds.includes(vid))
    ).slice(0, 4);
  }, [channelVideos]);

  const { toggleWatchLater, isInWatchLater } = useWatchLater();
  const [activeTab, setActiveTab] = useState("videos");
  const [isLoading, setIsLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [shortDrawerOpen, setShortDrawerOpen] = useState(false);
  const [selectedShort, setSelectedShort] = useState<ChannelShort | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [channel.id]);

  // Share this channel page (other share buttons set their own link)
  const handleShare = () => {
    setShareUrl(window.location.href);
    setShareModalOpen(true);
  };

  // Strip YouTube's fcrop64 crop instruction to get the full 16:9 banner
  const fullBannerUrl = channel.banner
    ? channel.banner.replace(/=.*$/, "=w1920")
    : "/vibrant-health-cover.png";

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return String(num);
  };

  const getPlaylistThumbs = (playlist: PlaylistItem): string[] => {
    return playlist.videoIds
      .slice(0, 4)
      .map((id) => {
        const v = videoData.find((v) => v.id === id);
        return v ? `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg` : null;
      })
      .filter(Boolean) as string[];
  };

  if (isLoading) {
    return <ChannelSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      {/* Mobile back button + channel name */}
      {isMobile && (
        <div className="sticky top-[56px] z-10 bg-background/95 backdrop-blur-sm border-b">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 w-full"
          >
            <ArrowLeft className="h-6 w-6 shrink-0" />
            <span className="text-sm font-medium line-clamp-1 text-left">
              {channel.name}
            </span>
          </button>
        </div>
      )}

      {/* One banner image per screen size: the browser downloads only the matching source.
          Mobile uses the original fcrop64 strip (~6:1, natural height); desktop uses the full
          =w1920 banner at a fixed height. Eager because it's at the top; not high priority because
          on mobile the main image is the first video, and they would compete for bandwidth. */}
      <div className="relative md:mx-6 md:mt-4 md:h-44 lg:h-52 xl:h-56 md:overflow-hidden md:rounded-2xl">
        <picture>
          <source media="(min-width: 768px)" srcSet={fullBannerUrl} />
          <img
            src={channel.banner || "/vibrant-health-cover.png"}
            alt="Channel banner"
            width={1707}
            height={282}
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            className="block w-full h-auto md:h-full md:object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Channel info header */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4">
        <div className="flex flex-row items-center gap-4 md:gap-6">
          <Avatar className="flex-shrink-0 h-20 w-20 md:h-40 md:w-40">
            <AvatarImage src={channel.avatar} />
            <AvatarFallback className="text-lg">
              {channel.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl md:text-4xl font-bold leading-tight">
                {channel.name}
              </h1>
              {channel.verified && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-muted-foreground flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="Verified"
                >
                  <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm5.707 7.293a1 1 0 010 1.414L10 17.414l-3.707-3.707a1 1 0 111.414-1.414L10 14.586l6.293-6.293a1 1 0 011.414 0Z" />
                </svg>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">@{channel.slug}</span>
              <span aria-hidden="true"> · </span>
              {formatNumber(channel.subscribers)} subscribers •{" "}
              {channelVideos.length} videos
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button
                variant="secondary"
                className="rounded-full h-9 px-4 flex-shrink-0 bg-muted hover:bg-accent font-medium"
                onClick={handleShare}
              >
                <ShareIcon className="h-5 w-5 mr-2" /> Share
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MoreButton />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    afterClose={() => setShowReportDialog(true)}
                  >
                    <Flag className="h-4 w-4" /> Report
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => dontRecommend(channel.id, channel.name)}
                  >
                    <Ban className="h-4 w-4" /> Don&apos;t recommend channel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={cn(
          "border-b",
          isMobile ? "sticky top-[96px] bg-background z-10" : ""
        )}
      >
        <Tabs
          defaultValue="videos"
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="h-12 bg-background w-full justify-start overflow-x-auto scrollbar-none px-2 md:px-4 rounded-none p-0">
            <TabsTrigger
              value="videos"
              className="h-12 px-3 md:px-4 rounded-none border-b-2 border-transparent text-base font-medium text-muted-foreground hover:text-foreground can-hover:hover:border-muted-foreground/40 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Videos
            </TabsTrigger>
            <TabsTrigger
              value="shorts"
              className="h-12 px-3 md:px-4 rounded-none border-b-2 border-transparent text-base font-medium text-muted-foreground hover:text-foreground can-hover:hover:border-muted-foreground/40 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Shorts
            </TabsTrigger>
            <TabsTrigger
              value="playlists"
              className="h-12 px-3 md:px-4 rounded-none border-b-2 border-transparent text-base font-medium text-muted-foreground hover:text-foreground can-hover:hover:border-muted-foreground/40 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Playlists
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="h-12 px-3 md:px-4 rounded-none border-b-2 border-transparent text-base font-medium text-muted-foreground hover:text-foreground can-hover:hover:border-muted-foreground/40 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              About
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content - Videos */}
      {activeTab === "videos" && (
        <>
          {channelVideos.length > 0 ? (
            <>
              <VideoGrid videos={channelVideos} className="md:px-6 py-4 md:py-6" />
            </>
          ) : (
            <div className="text-center py-16 px-3">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Play className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No videos yet</h3>
              <p className="text-sm text-muted-foreground">This channel hasn&apos;t uploaded any videos.</p>
            </div>
          )}
        </>
      )}

      {/* Tab content - Shorts */}
      {activeTab === "shorts" && (
        <>
          {channelShorts.length > 0 ? (
            <div className="grid gap-x-2 md:gap-x-4 gap-y-6 px-4 md:px-6 py-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {channelShorts.map((short) => (
                <ShortCard
                  key={short.id}
                  href={`/shorts?v=${short.videoId}`}
                  title={short.title}
                  views={`${short.views} views`}
                  thumbnail={youtubeThumb(short.videoId)}
                  menu={isMobile ? (
                    <MoreButton onClick={(e) => { e.stopPropagation(); setSelectedShort(short); setShortDrawerOpen(true); }} />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <MoreButton />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { toggleWatchLater({ id: short.id, title: short.title, channel: channel.name, channelAvatar: channel.avatar || "", thumbnail: `https://img.youtube.com/vi/${short.videoId}/hqdefault.jpg`, views: short.views, timeAgo: short.timeAgo, duration: short.duration }); }}>
                          <Clock className="h-4 w-4" /> {isInWatchLater(short.id) ? "Remove from Watch later" : "Save to Watch later"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" afterClose={() => openSaveCard({ id: short.id, title: short.title, channel: channel.name })}>
                          <SaveIcon className="h-4 w-4" /> Save to Playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { setShareUrl(`${window.location.origin}/shorts?v=${short.videoId}`); setShareModalOpen(true); }}>
                          <ShareIcon className="h-4 w-4" /> Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-3">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Play className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No shorts yet</h3>
              <p className="text-sm text-muted-foreground">This channel hasn&apos;t uploaded any shorts.</p>
            </div>
          )}

          {/* Mobile Drawer - single instance outside map */}
          <Drawer open={shortDrawerOpen} onOpenChange={setShortDrawerOpen}>
            <DrawerContent>
              <div className="p-4 pb-8 space-y-1">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm text-left"
                  onClick={() => {
                    if (selectedShort) {
                      toggleWatchLater({ id: selectedShort.id, title: selectedShort.title, channel: channel.name, channelAvatar: channel.avatar || "", thumbnail: `https://img.youtube.com/vi/${selectedShort.videoId}/hqdefault.jpg`, views: selectedShort.views, timeAgo: selectedShort.timeAgo, duration: selectedShort.duration });
                    }
                    setShortDrawerOpen(false);
                  }}
                >
                  <Clock className="h-4 w-4 flex-shrink-0" /> {selectedShort && isInWatchLater(selectedShort.id) ? "Remove from Watch later" : "Save to Watch later"}
                </button>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm text-left"
                  onClick={() => { const s = selectedShort; setShortDrawerOpen(false); if (s) setTimeout(() => openSaveCard({ id: s.id, title: s.title, channel: channel.name }), 150); }}
                >
                  <SaveIcon className="h-4 w-4 flex-shrink-0" /> Save to Playlist
                </button>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm text-left"
                  onClick={() => { if (selectedShort) { setShareUrl(`${window.location.origin}/shorts?v=${selectedShort.videoId}`); setShareModalOpen(true); } setShortDrawerOpen(false); }}
                >
                  <ShareIcon className="h-4 w-4 flex-shrink-0" /> Share
                </button>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}

      {/* Tab content - Playlists */}
      {activeTab === "playlists" && (
        <div className="px-4 md:px-6 py-6">
          {channelPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {channelPlaylists.map((playlist) => {
                const thumbs = getPlaylistThumbs(playlist);
                return (
                  <div
                    key={playlist.id}
                    className="group cursor-pointer"
                    onClick={() => {
                      playPlaylistFromTap(playlist.videoIds);
                      router.push(`/playlists/${playlist.slug}/${playlist.id}?source=channel`);
                    }}
                  >
                    <div className="relative aspect-video w-full bg-muted overflow-hidden rounded-xl">
                      {thumbs.length >= 2 ? (
                        <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="relative bg-muted overflow-hidden">
                              {thumbs[i] ? (
                                <Image src={thumbs[i]} alt="" fill className="object-cover" />
                              ) : (
                                <div className="absolute inset-0" style={{ backgroundColor: playlist.thumbnailColor, opacity: 0.4 }} />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : thumbs.length === 1 ? (
                        <Image src={thumbs[0]} alt={playlist.name} fill className="object-cover" />
                      ) : (
                        <>
                          <div className="absolute inset-0 opacity-30" style={{ backgroundColor: playlist.thumbnailColor }} />
                          <div className="absolute left-4 right-4 top-4 bottom-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: playlist.thumbnailColor }}>
                            <ListVideo className="h-10 w-10 text-white/60" />
                          </div>
                        </>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <ListVideo className="h-3 w-3" />
                        {playlist.videoIds.length}
                      </div>
                    </div>

                    <div className="pt-3">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium leading-snug line-clamp-2">
                            {playlist.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">View full playlist</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <MoreButton onClick={(e) => e.stopPropagation()} className="-mr-2" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/playlists/${playlist.slug}/${playlist.id}?source=channel`); }}>
                              <Play className="h-4 w-4" /> Play all
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShareUrl(`${window.location.origin}/playlists/${playlist.slug}/${playlist.id}`); setShareModalOpen(true); }}>
                              <ShareIcon className="h-4 w-4" /> Share
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-3">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <ListVideo className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No playlists yet</h3>
              <p className="text-sm text-muted-foreground">This channel has no playlists available.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab content - About */}
      {activeTab === "about" && (
        <div className="px-3 py-6 max-w-2xl space-y-4">
          <div className="p-4 border rounded-xl bg-card">
            <h2 className="text-base font-semibold mb-2">Description</h2>
            <DescriptionText text={channel.description || "No description provided."} className="text-sm text-muted-foreground leading-relaxed" />
          </div>
          <div className="p-4 border rounded-xl bg-card">
            <h3 className="text-base font-semibold mb-3">Details</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Channel name</span>
                <span className="font-medium">{channel.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Subscribers</span>
                <span className="font-medium">{formatNumber(channel.subscribers)}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Videos</span>
                <span className="font-medium">{channelVideos.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium">{channel.language.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} videoUrl={shareUrl} />
      <ReportDialog videoTitle={channel.name} videoId={channel.id} open={showReportDialog} onOpenChange={setShowReportDialog} />
    </div>
  );
}