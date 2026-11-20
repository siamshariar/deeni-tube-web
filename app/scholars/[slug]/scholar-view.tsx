// app/scholars/[slug]/scholar-view.tsx
// A scholar's page. Rendered by both /scholars/[slug] (the profile with Videos/Shorts/Playlists tabs) and
// /scholars/[slug]/about (the About page); which one shows follows the URL. The About tab switches with
// history.pushState, which Next.js syncs with usePathname: the URL changes to .../about and the About page
// shows instantly, with no request or page load (also in dev, where routes compile on first visit).
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Share,
  Flag,
  Ban,
  Play,
  Clock,
  Bookmark,
  ListVideo,
  Video,
  ExternalLink,
} from "lucide-react";
import ShortCard from "@/components/short-card";
import { youtubeThumb } from "@/lib/media-lookup";
import { MoreButton } from "@/components/more-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { scholarData, ScholarItem } from "@/lib/scholar-data";
import { videoData, VideoItem } from "@/lib/video-data";
import { extendedPlaylists } from "@/lib/playlist-data";
import { ShareModal } from "@/components/share-modal";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ReportDialog } from "@/components/report-dialog";
import { useWatchLater } from "@/hooks/useWatchLater";
import { toast } from "sonner";


import { useDontRecommend } from "@/hooks/useDontRecommend";
import type { ChannelShort } from "@/lib/types";
import VideoGrid from "@/components/video-grid";
import { ScholarAbout, scholarTopics } from "@/components/scholar-about";
import { videoPath } from "@/lib/video-url";
const mockShortsByChannel: Record<string, ChannelShort[]> = {
  "monzur": [
    { id: "sh1", videoId: "MBxDbbkk0gQ", title: "একমাত্র আল্লাহর রাজত্বই চিরস্থায়ী", views: "15K", timeAgo: "2 weeks ago", duration: "0:58" },
    { id: "sh2", videoId: "goHfO28fE-A", title: "যারা বলে আমাদের রব আল্লাহ", views: "25K", timeAgo: "3 days ago", duration: "0:45" },
    { id: "sh3", videoId: "8YfQCDjlQsc", title: "ইমামের দূর্ব্যবহারের কারণে কেউ ওই মাসজিদে না গেলে কি অন্যায় হবে?", views: "50K", timeAgo: "1 week ago", duration: "0:51" },
  ],
  "abdullah-jahangir": [
    { id: "sh6", videoId: "PUwTf64igQk", title: "এভাবে ঈমান নষ্ট করছেন নাতো?", views: "35K", timeAgo: "4 days ago", duration: "0:52" },
    { id: "sh7", videoId: "hHpoYE-v6og", title: "রোগ-ব্যাধিতে ধৈর্য ধারণ করা", views: "28K", timeAgo: "1 week ago", duration: "0:42" },
  ],
  "abu-bakar-zakariya": [
    { id: "sh9", videoId: "rTrh9VHgdwo", title: "ওজুতে ঘাড় মাসাহ করা সুন্নাহ নাকি বিদ'আত", views: "12K", timeAgo: "1 week ago", duration: "0:55" },
    { id: "sh10", videoId: "ihdO_G6Yk0E", title: "দুনিয়াতেই জান্নাত আছে আপনি কি জানেন? ✨", views: "28K", timeAgo: "3 days ago", duration: "0:50" },
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
  "imam-hossain": [
    { id: "sh18", videoId: "_zCnmnCd7CU", title: "কুরআনের আলোকে জীবন গড়ুন", views: "18K", timeAgo: "5 days ago", duration: "0:58" },
  ],
};

function ScholarSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="px-4 md:px-6 pt-5 md:pt-8 pb-4">
        <div className="flex items-center gap-4 md:gap-6">
          <Skeleton className="h-20 w-20 md:h-40 md:w-40 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 md:h-10 w-48 md:w-72" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="h-12 border-b" />
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 px-6 py-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-video w-full rounded-xl" />
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


export default function ScholarView() {
  const router = useRouter();
  const params = useParams();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const dontRecommend = useDontRecommend();
  const slug = params.slug as string;

  const scholar: ScholarItem | undefined = scholarData.find((s) => s.slug === slug);

  const [activeTab, setActiveTab] = useState("videos");
  const pathname = usePathname();
  const showAbout = !!pathname?.endsWith("/about");
  // The profile's loading placeholder isn't shown when the About page is opened directly
  const [isLoading, setIsLoading] = useState(() => !showAbout);
  // Set when the About page was opened from the profile, so going back returns to that history entry
  const openedAboutRef = useRef(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedShort, setSelectedShort] = useState<ChannelShort | null>(null);
  const [shortDrawerOpen, setShortDrawerOpen] = useState(false);
  const [showShortPlaylistDialog, setShowShortPlaylistDialog] = useState(false);
  const { addToWatchLater, isInWatchLater } = useWatchLater();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [slug]);

  if (!scholar) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Scholar not found</h2>
          <Button onClick={() => router.push("/scholars")} className="rounded-full mt-4">
            Back to Scholars
          </Button>
        </div>
      </div>
    );
  }

  const allVideos: VideoItem[] = videoData.filter((v) => v.channelId === scholar.channelId);
  const shorts = mockShortsByChannel[scholar.channelId] || [];
  const playlists = extendedPlaylists.filter((pl) =>
    pl.isPublic && pl.videoIds.some((vid) => allVideos.some((v) => v.id === vid))
  );

  const openAbout = () => {
    // Radix Tabs can report one click twice (focus and pointer down): add a single history entry
    if (window.location.pathname.endsWith("/about")) return;
    openedAboutRef.current = true;
    window.history.pushState(null, "", `/scholars/${slug}/about`);
    window.scrollTo(0, 0);
  };
  const showProfile = () => {
    if (openedAboutRef.current) {
      openedAboutRef.current = false;
      window.history.back();
    } else {
      window.history.pushState(null, "", `/scholars/${slug}`);
      window.scrollTo(0, 0);
    }
  };

  // ── About page ──
  if (showAbout) {
    return (
      <div className="min-h-screen bg-background pt-14">
        {/* Back button — mobile only */}
        <div className="md:hidden sticky top-[56px] z-10 bg-background/95 backdrop-blur-sm border-b">
          <button onClick={showProfile} className="flex items-center gap-1.5 px-4 py-2 w-full">
            <ArrowLeft className="h-6 w-6 shrink-0" />
            <span className="text-sm font-medium line-clamp-1 text-left">About {scholar.name}</span>
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-12 pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-background flex-shrink-0">
              <AvatarImage src={scholar.avatar} alt={scholar.name} className="object-cover" />
              <AvatarFallback className="text-2xl">{scholar.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold leading-tight">{scholar.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{scholar.designation}</p>
            </div>
          </div>

          <div className="mb-8">
            <ScholarAbout scholar={scholar} videos={allVideos} />
          </div>

          {allVideos.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Recent videos
                </h2>
                <button type="button" onClick={showProfile} className="text-sm font-medium text-[#065fd4] dark:text-[#3ea6ff] hover:underline flex items-center gap-1">
                  See all <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {allVideos.slice(0, 3).map((video) => (
                  <Link key={video.id} href={videoPath(video)} className="flex gap-3 group">
                    <div className="relative w-40 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      <Image src={youtubeThumb(video.videoId, "small")} alt={video.title} fill sizes="160px" className="object-cover" />
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-px text-xs font-medium leading-[18px] text-white">{video.duration}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium leading-5 line-clamp-2 [overflow-wrap:anywhere]">{video.title}</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">{video.views} · {video.timeAgo}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <Button variant="outline" className="rounded-full w-full" onClick={showProfile}>
            View full profile
          </Button>
        </div>

        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: scholar.name,
              jobTitle: scholar.designation,
              image: scholar.avatar,
              description: scholar.description,
              knowsAbout: scholarTopics(allVideos),
              inLanguage: scholar.language,
            }),
          }}
        />
      </div>
    );
  }

  if (isLoading) return <ScholarSkeleton />;

  return (
    <div className="min-h-screen bg-background pt-14">
      {isMobile && (
        <div className="sticky top-[56px] z-10 bg-background/95 backdrop-blur-sm border-b">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 px-4 py-2 w-full">
            <ArrowLeft className="h-6 w-6 shrink-0" />
            <span className="text-sm font-medium line-clamp-1 text-left">{scholar.name}</span>
          </button>
        </div>
      )}

      {/* Profile section — no banner, avatar sits at top */}
      <div className="px-4 md:px-6 pt-5 md:pt-8 pb-4">
        <div className="flex flex-row items-center gap-4 md:gap-6">
          <Avatar className="flex-shrink-0 h-20 w-20 md:h-40 md:w-40">
            <AvatarImage src={scholar.avatar} alt={scholar.name} className="object-cover" />
            <AvatarFallback className="text-lg">{scholar.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-4xl font-bold leading-tight">{scholar.name}</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">{scholar.designation}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allVideos.length} videos · {shorts.length} shorts
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Button variant="secondary" className="rounded-full h-9 px-4 bg-muted hover:bg-accent font-medium" onClick={() => { setShareUrl(window.location.href); setShareModalOpen(true); }}>
                <Share className="h-5 w-5 mr-2" /> Share
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MoreButton />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowReportDialog(true); }}><Flag className="h-4 w-4" /> Report</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => dontRecommend(scholar.channelId, scholar.name)}><Ban className="h-4 w-4" /> Don&apos;t recommend</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {/* About opens the About page (instantly, see openAbout); the other tabs switch in place */}
      <Tabs value={activeTab} onValueChange={(value) => (value === "about" ? openAbout() : setActiveTab(value))}>
        <TabsList className="h-12 bg-background w-full justify-start overflow-x-auto scrollbar-none px-2 md:px-4 border-b rounded-none p-0">
          <TabsTrigger value="videos" className="h-12 px-3 md:px-4 rounded-none border-b-2 border-transparent text-base font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Videos
          </TabsTrigger>
          <TabsTrigger value="shorts" className="h-12 px-3 md:px-4 rounded-none border-b-2 border-transparent text-base font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Shorts
          </TabsTrigger>
          <TabsTrigger value="playlists" className="h-12 px-3 md:px-4 rounded-none border-b-2 border-transparent text-base font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Playlists
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="h-12 px-3 md:px-4 rounded-none border-b-2 border-transparent text-base font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            About
          </TabsTrigger>
        </TabsList>

        {/* ── Videos tab ── */}
        {activeTab === "videos" && (
          <div className="px-4 md:px-6 py-6">
            {allVideos.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Play className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No videos found</p>
              </div>
            ) : (
              <>
                <VideoGrid videos={allVideos} className="-mx-4 md:mx-0" />
              </>
            )}
          </div>
        )}

        {/* ── Shorts tab ── */}
        {activeTab === "shorts" && (
          <div className="px-4 md:px-6 py-6">
            {shorts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Play className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No shorts available</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 md:gap-x-4 gap-y-6">
                  {shorts.map((short: ChannelShort) => (
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
                            <DropdownMenuItem className="cursor-pointer" onSelect={() => {
                              if (isInWatchLater(short.id)) { toast.success("Already in Watch Later"); }
                              else { addToWatchLater({ id: short.id, title: short.title, channel: scholar.name, channelAvatar: scholar.avatar || "", thumbnail: `https://img.youtube.com/vi/${short.videoId}/hqdefault.jpg`, views: short.views, timeAgo: short.timeAgo, duration: short.duration, addedAt: Date.now() }); toast.success("Added to Watch Later"); }
                            }}>
                              <Clock className="h-4 w-4" /> {isInWatchLater(short.id) ? "Saved to Watch Later" : "Save to Watch Later"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setSelectedShort(short); setShowShortPlaylistDialog(true); }}>
                              <Bookmark className="h-4 w-4" /> Save to Playlist
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onSelect={() => { setShareUrl(`${window.location.origin}/shorts?v=${short.videoId}`); setShareModalOpen(true); }}>
                              <Share className="h-4 w-4" /> Share
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    />
                  ))}
                </div>

                {/* Mobile Drawer - single instance outside map */}
                <Drawer open={shortDrawerOpen} onOpenChange={setShortDrawerOpen}>
                  <DrawerContent>
                    <div className="p-4 pb-8 space-y-1">
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm text-left"
                        onClick={() => {
                          if (selectedShort) {
                            if (isInWatchLater(selectedShort.id)) { toast.success("Already in Watch Later"); }
                            else { addToWatchLater({ id: selectedShort.id, title: selectedShort.title, channel: scholar.name, channelAvatar: scholar.avatar || "", thumbnail: `https://img.youtube.com/vi/${selectedShort.videoId}/hqdefault.jpg`, views: selectedShort.views, timeAgo: selectedShort.timeAgo, duration: selectedShort.duration, addedAt: Date.now() }); toast.success("Added to Watch Later"); }
                          }
                          setShortDrawerOpen(false);
                        }}
                      >
                        <Clock className="h-4 w-4 flex-shrink-0" /> {selectedShort && isInWatchLater(selectedShort.id) ? "Saved to Watch Later" : "Save to Watch Later"}
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm text-left"
                        onClick={() => { setShowShortPlaylistDialog(true); setShortDrawerOpen(false); }}
                      >
                        <Bookmark className="h-4 w-4 flex-shrink-0" /> Save to Playlist
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm text-left"
                        onClick={() => { if (selectedShort) { setShareUrl(`${window.location.origin}/shorts?v=${selectedShort.videoId}`); setShareModalOpen(true); } setShortDrawerOpen(false); }}
                      >
                        <Share className="h-4 w-4 flex-shrink-0" /> Share
                      </button>
                    </div>
                  </DrawerContent>
                </Drawer>
              </>
            )}
          </div>
        )}

        {/* ── Playlists tab ── */}
        {activeTab === "playlists" && (
          <div className="px-4 md:px-6 py-6">
            {playlists.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <ListVideo className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No playlists available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {playlists.map((pl) => {
                  const thumbs = pl.videoIds
                    .slice(0, 4)
                    .map((id) => {
                      const v = videoData.find((v) => v.id === id);
                      return v ? `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg` : null;
                    })
                    .filter(Boolean) as string[];
                  return (
                    <Link key={pl.id} href={`/playlists/${pl.slug}/${pl.id}?source=channel`} className="group block">
                      <div className="relative aspect-video w-full bg-muted overflow-hidden rounded-xl">
                        {thumbs.length >= 2 ? (
                          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className="relative bg-muted overflow-hidden">
                                {thumbs[i] ? (
                                  <Image src={thumbs[i]} alt="" fill className="object-cover" />
                                ) : (
                                  <div className="absolute inset-0 bg-muted" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : thumbs.length === 1 ? (
                          <Image src={thumbs[0]} alt={pl.name} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ListVideo className="h-10 w-10 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <ListVideo className="h-3 w-3" />
                          {pl.videoIds.length}
                        </div>
                      </div>
                      <div className="pt-3">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-medium leading-snug line-clamp-2">{pl.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">View full playlist</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <MoreButton onClick={(e) => e.stopPropagation()} className="-mr-2" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/playlists/${pl.slug}/${pl.id}?source=channel`); }}>
                                <Play className="h-4 w-4" /> Play all
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShareUrl(`${window.location.origin}/playlists/${pl.slug}/${pl.id}`); setShareModalOpen(true); }}>
                                <Share className="h-4 w-4" /> Share
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Tabs>

      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} videoUrl={shareUrl} />
      <ReportDialog videoTitle={scholar.name} videoId={scholar.channelId} open={showReportDialog} onOpenChange={setShowReportDialog} />
      {selectedShort && (
        <AddToPlaylistDialog
          video={{ id: selectedShort.id, title: selectedShort.title, channel: scholar.name }}
          open={showShortPlaylistDialog}
          onOpenChange={setShowShortPlaylistDialog}
        />
      )}
    </div>
  );
}
