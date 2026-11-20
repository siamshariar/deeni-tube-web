// app/categories/[slug]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  X,
  FolderOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { videoData, VideoItem, categoryData } from "@/lib/video-data";
import { SortDropdown } from "@/components/sort-dropdown";
import VideoGrid from "@/components/video-grid";

const SORT_OPTIONS = [
  { label: "Priority", value: "priority" },
  { label: "Latest", value: "latest" },
  { label: "Most Popular", value: "popular" },
];

function VideoSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="flex mt-2 gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function VideoSkeletonHorizontal() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="w-40 aspect-video rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export default function CategoryVideosPage() {
  const router = useRouter();
  const params = useParams();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const slug = params.slug as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sortMode, setSortMode] = useState<"priority" | "latest" | "popular">("priority");

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [slug]);

  // Get category info
  const category = categoryData.find((c) => c.slug === slug);

  // Get real videos for this category
  const categoryVideos: VideoItem[] = videoData.filter(
    (v) => v.category.toLowerCase().replace(/\s+/g, "-") === slug
  );

  // Derive category name
  const categoryName = category?.name || slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const categoryDescription = category?.description || `Videos about ${categoryName}`;

  const filteredVideos = categoryVideos
    .filter(
      (v) =>
        !searchQuery ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.channel.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortMode === "latest") {
        const getDate = (time: string) => {
          const num = parseInt(time);
          if (time.includes("day")) return num;
          if (time.includes("week")) return num * 7;
          if (time.includes("month")) return num * 30;
          if (time.includes("year")) return num * 365;
          return 0;
        };
        return getDate(a.timeAgo) - getDate(b.timeAgo);
      }
      if (sortMode === "popular") {
        const parseView = (v: string) => {
          const num = parseFloat(v.replace("K", "").replace("M", ""));
          return v.includes("M") ? num * 1000000 : v.includes("K") ? num * 1000 : num;
        };
        return parseView(b.views) - parseView(a.views);
      }
      return 0;
    });


  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header – sticky back button */}
      <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b sticky top-[56px] bg-background z-10">
        <button aria-label="Go back"
          onClick={() => router.back()}
          className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted flex-shrink-0 -ml-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-lg truncate">{categoryName}</h1>
      </div>

      <div className="px-3 md:px-6 py-4 md:py-6 mt-14 md:mt-16">
        {isLoading ? (
          <>
            <div className="hidden md:block mb-4">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="mb-6">
              <Skeleton className="h-10 w-full md:w-64 rounded-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-16 rounded-full" />
                <Skeleton className="h-9 w-16 rounded-full" />
                <Skeleton className="h-9 w-16 rounded-full" />
              </div>
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <VideoSkeleton key={i} />
              ))}
            </div>
            <div className="flex flex-col md:hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <VideoSkeletonHorizontal key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            {!isMobile && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold">{categoryName}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {categoryDescription}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredVideos.length} video{filteredVideos.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* Search + Sort chips */}
            <div className="mb-6">
              <div className="flex flex-col items-start md:flex-row md:items-center md:justify-between gap-3">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={`Search ${categoryName} videos...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 h-10 text-sm rounded-full bg-muted/50 focus:bg-muted transition-colors"
                  />
                  {searchQuery && (
                    <button aria-label="Clear search"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <SortDropdown
                  options={SORT_OPTIONS}
                  currentValue={sortMode}
                  onSelect={(v) => setSortMode(v as typeof sortMode)}
                />
              </div>
            </div>

            {filteredVideos.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No videos found</h3>
                <p className="text-muted-foreground">
                  Try different search terms or sort options
                </p>
              </div>
            ) : (
              <>
                <VideoGrid videos={filteredVideos} className="-mx-3 md:mx-0" />
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
}