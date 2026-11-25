// app/categories/[slug]/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LIST_SEARCH, ListHeader } from "@/components/list-header";
import { PageBar } from "@/components/page-bar";
import { PAGE_UNDER_BAR } from "@/components/page-layout";
import { SearchField } from "@/components/search-field";
import { SortDropdown } from "@/components/sort-dropdown";
import VideoGrid from "@/components/video-grid";
import { countText } from "@/lib/format";
import { daysAgo } from "@/lib/time-ago";
import { categoryData, videoData } from "@/lib/video-data";
import { cn } from "@/lib/utils";
import { filterIn } from "@/lib/search-match";

const SORT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Latest", value: "latest" },
  { label: "Most popular", value: "popular" },
] as const;
type Sort = (typeof SORT_OPTIONS)[number]["value"];

const viewCount = (views: string) => parseFloat(views) * (views.includes("M") ? 1_000_000 : views.includes("K") ? 1_000 : 1);

export default function CategoryVideosPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<Sort>("default");

  // The [slug] layout already returns a 404 for unknown categories
  const category = categoryData.find((c) => c.slug === slug);
  const name = category?.name ?? "";
  const all = videoData.filter((v) => v.category === name);

  const videos = filterIn(all, searchQuery, (v) => [v.title, v.channel])
    .sort((a, b) => (sort === "latest" ? daysAgo(a.timeAgo) - daysAgo(b.timeAgo) : sort === "popular" ? viewCount(b.views) - viewCount(a.views) : 0));

  return (
    <div className="min-h-screen bg-background pt-14">
      <PageBar as="h1" title={name} parent="/categories" />

      <div className={cn(PAGE_UNDER_BAR, "md:mt-2")}>
        <ListHeader
          title={name}
          titleInBar
          subtitle={
            <>
              {category?.description} <span aria-hidden="true">•</span> {countText(all.length, "video")}
            </>
          }
        >
          <SearchField value={searchQuery} onChange={setSearchQuery} label={`Search in ${name}`} className={LIST_SEARCH} />
          <SortDropdown options={SORT_OPTIONS} currentValue={sort} onSelect={setSort} />
        </ListHeader>

        <h2 className="sr-only">Videos</h2>
        {videos.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No videos found" description="Try different keywords" />
        ) : (
          <VideoGrid videos={videos} className="-mx-3 md:mx-0" />
        )}
      </div>
    </div>
  );
}
