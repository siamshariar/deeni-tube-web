// app/page.tsx
"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { CHIP, CHIP_OFF, CHIP_ON } from "@/components/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import VideoGrid, { videoColumns } from "@/components/video-grid";
import LanguagePrompt from "@/components/language-prompt";
import { categoryData, videoData, VideoItem } from "@/lib/video-data";
import { useHeader } from "@/app/contexts/header-context";
import { useFeedPreferences } from "@/hooks/useFeedPreferences";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";

// A chip for each category that has videos, the ones on the Categories page
const chipItems = ["All", ...categoryData.map((c) => c.name)];

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
  const sidebarCollapsed = useSidebarCollapsed();

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
    setInitialLoading(false); // the visitor's languages are known: the feed shows at once
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

  // The logo or a Home link pressed while already on Home starts the feed over, as on YouTube: "All", from the top
  // (Next.js does nothing for a link to the page it's on)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // opens a new tab or window
      if (!(e.target as Element).closest('a[href="/"]')) return;
      setActiveChip("All");
      scrollContainerRef.current?.scrollTo({ left: 0 });
      window.scrollTo(0, 0);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

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
  const chipBarLeft = sidebarCollapsed ? "md:left-[calc(72px+var(--sal))]" : "md:left-[calc(240px+var(--sal))]";
  const chipBarWidth = sidebarCollapsed ? "md:w-[calc(100%-72px-var(--sal)-var(--sar))]" : "md:w-[calc(100%-240px-var(--sal)-var(--sar))]";

  const gridColumns = videoColumns(sidebarCollapsed);

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
          "sidebar-offset fixed left-0 z-20 h-14 w-full bg-background pl-[var(--sal)] pr-[var(--sar)] transition-all duration-300 md:px-0",
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
                className={cn(CHIP, activeChip === chip ? CHIP_ON : CHIP_OFF)}
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
        <h2 className="sr-only">Videos</h2>
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
          <EmptyState
            icon={Clapperboard}
            title={activeChip === "All" ? "No videos to show" : `No ${activeChip} videos yet`}
            description={
              activeChip === "All"
                ? "Try adding more languages or channels to your feed."
                : "Nothing in this category matches your languages yet. Check back soon."
            }
            className="py-24"
          >
            {activeChip !== "All" && (
              <Button variant="outline" onClick={() => setActiveChip("All")}>
                Show all videos
              </Button>
            )}
          </EmptyState>
        ) : (
          <VideoGrid videos={displayedVideos} className="pb-4 sm:pt-4 md:px-4 md:pb-10 md:pt-6 lg:px-6" />
        )}
      </div>
    </div>
  );
}