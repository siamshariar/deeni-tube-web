// app/page.tsx
"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import VideoCard from "@/components/video-card";
import LanguagePrompt from "@/components/language-prompt";
import { videoData, VideoItem } from "@/lib/video-data";
import { useHeader } from "@/app/contexts/header-context";
import { useFeedPreferences } from "@/hooks/useFeedPreferences";
import { priorityForIndex } from "@/lib/image-priority";
import { cn } from "@/lib/utils";

export default function Home() {
  const { headerVisible, setHeaderVisible } = useHeader();
  const prevScrollPosRef = useRef(0);
  const [activeChip, setActiveChip] = useState("All");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [allVideos] = useState<VideoItem[]>(videoData);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(["en"]);
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const { followedChannels: visibleChannelIds } = useFeedPreferences();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const allCategories: string[] = videoData
    .map((v: VideoItem) => v.category)
    .filter(Boolean) as string[];
  const uniqueCategories: string[] = Array.from(new Set(allCategories));
  const extraCategories = [
    "Quran",
    "Hadith",
    "Fiqh",
    "Tafsir",
    "Seerah",
    "Dua",
    "Aqeedah",
    "Manners",
    "History",
    "Youth",
    "Family",
    "Society",
    "Science",
    "Spirituality",
    "Health",
  ];
  // Set removes categories that appear in both lists (e.g. "Quran")
  const chipItems: string[] = Array.from(new Set(["All", ...uniqueCategories, ...extraCategories]));

  // Listen for sidebar class changes using MutationObserver
  useEffect(() => {
    const checkSidebarState = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        setSidebarCollapsed(sidebar.classList.contains('w-[72px]'));
      }
    };

    // Initial check
    checkSidebarState();

    // Observe sidebar class changes
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            checkSidebarState();
          }
        });
      });
      observer.observe(sidebar, { attributes: true });
      return () => observer.disconnect();
    }
  }, []);

  // Runs synchronously before first paint — sets modal/language state so
  // the feed is never visible to the user before the language modal on first visit.
  useLayoutEffect(() => {
    const hasSelectedPref = localStorage.getItem("deeni-lang-prefs");
    if (!hasSelectedPref) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
      setIsFirstTime(true);
      setShowLanguagePrompt(true);
    } else {
      try {
        const parsed = JSON.parse(hasSelectedPref);
        setPreferredLanguages(parsed.languages || ["en"]);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const saveLanguagePrefs = (languages: string[], guest: boolean = true) => {
    setPreferredLanguages(languages);
    localStorage.setItem(
      "deeni-lang-prefs",
      JSON.stringify({ languages, hasSelected: true, isGuest: guest })
    );
    setShowLanguagePrompt(false);
  };

  const skipLanguage = () => {
    saveLanguagePrefs(["en"], true);
  };

  // Scroll handler — hide/show both header and chip bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const isScrollingDown = currentScrollPos > prevScrollPosRef.current;
      const isNearTop = currentScrollPos < 56;

      if (isNearTop) {
        setHeaderVisible(true);
      } else if (isScrollingDown && currentScrollPos > 100) {
        setHeaderVisible(false);
      } else if (!isScrollingDown) {
        setHeaderVisible(true);
      }

      prevScrollPosRef.current = currentScrollPos;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      setHeaderVisible(true); // restore header when leaving home page
    };
  }, [setHeaderVisible]);

  const filteredVideos = allVideos.filter(
    (v: VideoItem) =>
      preferredLanguages.includes(v.language) &&
      visibleChannelIds.includes(v.channelId)
  );
  const displayedVideos =
    activeChip === "All"
      ? filteredVideos
      : filteredVideos.filter((v: VideoItem) => v.category === activeChip);

  // Chip bar position: follows header visibility, starts right below header
  const chipBarTop = headerVisible ? "top-[56px]" : "top-0";
  const contentMarginTop = headerVisible ? "112px" : "56px";
  
  // Dynamic chip bar width based on sidebar state
  const chipBarLeft = sidebarCollapsed ? "md:left-[72px]" : "md:left-[240px]";
  const chipBarWidth = sidebarCollapsed ? "md:w-[calc(100%-72px)]" : "md:w-[calc(100%-240px)]";

  // Grid columns: 3 per row with the full sidebar, 4 with the mini sidebar (more room),
  // fewer on narrower screens.
  const gridColumns = sidebarCollapsed
    ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <h1 className="sr-only">Deeni.tube home</h1>
      <LanguagePrompt
        open={showLanguagePrompt}
        canDismiss={!isFirstTime}
        onSave={(langs: string[]) => saveLanguagePrefs(langs, true)}
        onClose={() => setShowLanguagePrompt(false)}
        onSkip={skipLanguage}
        initialSelected={preferredLanguages}
      />

      {/* Category chip bar — hidden until first-time language selection is done */}
      <div
        className={cn(
          "sidebar-offset fixed z-20 h-14 bg-background w-full transition-all duration-300",
          chipBarLeft,
          chipBarWidth,
          chipBarTop,
          (!headerVisible || (isFirstTime && showLanguagePrompt)) && "-translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <div
          ref={scrollContainerRef}
          className="h-full overflow-x-auto scrollbar-none px-3 lg:px-6"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
        >
          <div className="flex gap-3 w-max items-center h-full">
            {chipItems.map((chip: string) => (
              <button
                key={chip}
                type="button"
                aria-pressed={activeChip === chip}
                onClick={() => setActiveChip(chip)}
                className={cn(
                  "h-8 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 select-none",
                  activeChip === chip
                    ? "bg-foreground text-background"
                    : "bg-muted hover:bg-accent text-foreground"
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area — hidden behind modal on first visit */}
      <div
        style={{ marginTop: contentMarginTop }}
        className={cn("transition-[margin-top] duration-300", isFirstTime && showLanguagePrompt && "invisible")}
      >
        {initialLoading ? (
          <>
            <div className={cn(
              "hidden md:grid gap-x-4 gap-y-10 px-4 pb-10 pt-6 lg:px-6",
              gridColumns
            )}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`dsk-${i}`} className="flex flex-col">
                  <Skeleton className="aspect-video w-full rounded-xl" />
                  <div className="flex gap-3 pt-3">
                    <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <Skeleton className="h-4 w-11/12" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3.5 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 pb-4 sm:grid-cols-2 sm:gap-x-4 sm:px-4 sm:pt-4 md:hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`msk-${i}`} className="flex flex-col">
                  <Skeleton className="aspect-video w-full rounded-none sm:rounded-xl" />
                  <div className="flex gap-3 px-3 pt-3">
                    <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <Skeleton className="h-4 w-11/12" />
                      <Skeleton className="h-3.5 w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : displayedVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-24">
            <h2 className="text-lg font-semibold mb-1">
              {activeChip === "All" ? "No videos to show" : `No ${activeChip} videos yet`}
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {activeChip === "All"
                ? "Try adding more languages or channels to your feed."
                : "Nothing in this category matches your languages yet. Check back soon."}
            </p>
            {activeChip !== "All" && (
              <Button variant="outline" className="rounded-full" onClick={() => setActiveChip("All")}>
                Show all videos
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={cn(
              "hidden md:grid gap-x-4 gap-y-10 px-4 pb-10 pt-6 lg:px-6",
              gridColumns
            )}>
              {displayedVideos.map((video: VideoItem, index: number) => (
                <VideoCard
                  key={video.id}
                  videoId={video.videoId}
                  title={video.title}
                  channel={video.channel}
                  channelId={video.channelId}
                  channelAvatar={video.channelAvatar}
                  views={video.views}
                  timestamp={video.timeAgo}
                  duration={video.duration}
                  thumbnail={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                  isHorizontal={false}
                  imagePriority={priorityForIndex(index)}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 pb-4 sm:grid-cols-2 sm:gap-x-4 sm:px-4 sm:pt-4 md:hidden">
              {displayedVideos.map((video: VideoItem, index: number) => (
                <VideoCard
                  key={video.id}
                  videoId={video.videoId}
                  title={video.title}
                  channel={video.channel}
                  channelId={video.channelId}
                  channelAvatar={video.channelAvatar}
                  views={video.views}
                  timestamp={video.timeAgo}
                  duration={video.duration}
                  thumbnail={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                  isHorizontal={true}
                  imagePriority={priorityForIndex(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}