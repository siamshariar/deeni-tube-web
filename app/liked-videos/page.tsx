// app/liked-videos/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ThumbsUp,
  Play,
  Shuffle,
  Trash2,
      Clock,
} from "lucide-react";
import { SaveIcon, ShareIcon } from "@/components/icons/action-icons";
import ShortCard from "@/components/short-card";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { WatchedBar } from "@/components/watched-bar";
import { notify, copyLink } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useLikedVideos, LikedVideo } from "@/hooks/useLikedVideos";
import { useWatchLater } from "@/hooks/useWatchLater";
import { useHydrated } from "@/lib/local-store";
import { openSaveCard } from "@/lib/save-card";

import { imagePriorityProps, priorityForIndex } from "@/lib/image-priority";
import { youtubeThumb, mediaThumb } from "@/lib/media-lookup";
import { videoPath } from "@/lib/video-url";
type FilterOption = "all" | "videos" | "shorts";

const ytId = (v: LikedVideo) => v.videoId ?? v.id;
const videoHref = (v: LikedVideo) => videoPath({ title: v.title, videoId: ytId(v) });
const shortHref = (v: LikedVideo) => `/shorts?v=${ytId(v)}`;

export default function LikedVideosPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { likedVideos, unlike } = useLikedVideos();
  const { toggleWatchLater, isInWatchLater } = useWatchLater();
  const videos = useMemo(() => likedVideos.filter((v) => v.type !== "short"), [likedVideos]);
  const shorts = useMemo(() => likedVideos.filter((v) => v.type === "short"), [likedVideos]);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");

  const removeVideo = (id: string) => {
    notify("Removed from Liked videos", { undo: unlike(id), thumb: mediaThumb(id) });
  };
  const removeShort = removeVideo;

  const saveToWatchLater = (v: LikedVideo) => toggleWatchLater(v);

  const shareVideo = (path: string) => copyLink(`${window.location.origin}${path}`);

  const firstVideo = videos[0];
  // Cover: the first video (or the first short when only shorts are saved)
  const cover = firstVideo ?? shorts[0];
  const coverThumb = cover ? youtubeThumb(ytId(cover)) : null;
  const coverHref = firstVideo ? videoHref(firstVideo) : cover ? shortHref(cover) : "/";
  const playAll = () => {
    if (cover) router.push(coverHref);
  };
  const shufflePlay = () => {
    const r = videos[Math.floor(Math.random() * videos.length)];
    if (r) router.push(videoHref(r));
    else playAll();
  };

  const showVideos = activeFilter === "all" || activeFilter === "videos";
  const showShorts = activeFilter === "all" || activeFilter === "shorts";
  const isEmpty = videos.length === 0 && shorts.length === 0;

  return (
    <div className="min-h-screen bg-background mt-14 md:mt-16">
      <div className="px-3 pb-8 md:px-6 md:py-6">
        {!hydrated ? null : isEmpty ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ThumbsUp className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="mb-2 text-xl font-bold">No liked videos</h1>
            <p className="mb-5 text-sm text-muted-foreground">
              Videos you like will appear here
            </p>
            <Button className="rounded-full" onClick={() => router.push("/")}>
              Browse videos
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            {/* ── Playlist panel: a hero on phones and tablets, a sticky side panel on desktop (YouTube layout) ── */}
            <div className="-mx-3 md:mx-0 lg:sticky lg:top-[88px] lg:h-[calc(100vh-112px)] lg:w-[340px] lg:flex-shrink-0 lg:self-start xl:w-[360px]">
              <div className="relative flex h-full flex-col overflow-hidden bg-neutral-800 text-white md:rounded-2xl">
                {/* Blurred cover behind the panel; white text stays readable in both themes */}
                {coverThumb && (
                  <>
                    <Image
                      src={coverThumb}
                      alt=""
                      fill
                      loading="eager" // same file as the cover below, so no extra download
                      className="scale-125 object-cover opacity-80 blur-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/85" />
                  </>
                )}

                <div className="relative z-10 flex flex-col p-4 md:flex-row md:items-end md:gap-6 md:p-6 lg:flex-col lg:items-stretch lg:gap-0">
                  {cover && coverThumb && (
                    <Link href={coverHref} className="group mb-4 block flex-shrink-0 md:mb-0 md:w-80 lg:mb-5 lg:w-full">
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/30">
                        <Image
                          src={coverThumb}
                          alt={cover.title}
                          fill
                          {...imagePriorityProps("lcp", { preload: false })}
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <Play className="h-5 w-5 fill-white" /> Play all
                          </span>
                        </div>
                      </div>
                    </Link>
                  )}

                  <div className="min-w-0">
                    <ThumbsUp className="mb-2 h-6 w-6 opacity-80" />
                    <h1 className="text-2xl font-bold leading-8 md:text-[28px] md:leading-9">Liked videos</h1>
                    <p className="mt-2 text-[13px] leading-5 text-white/75">
                      {videos.length} videos · {shorts.length} shorts · Private
                    </p>

                    {/* Play all / Shuffle */}
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={playAll}
                        className="h-10 flex-1 gap-2 rounded-full bg-white text-sm font-medium text-black hover:bg-white/85"
                      >
                        <Play className="h-5 w-5 fill-current" /> Play all
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={shufflePlay}
                        className="h-10 flex-1 gap-2 rounded-full bg-white/20 text-sm font-medium text-white hover:bg-white/30 hover:text-white"
                      >
                        <Shuffle className="h-5 w-5" /> Shuffle
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="flex-1 min-w-0">
              {/* Filter chips */}
              <div className="mb-5 flex items-center gap-3 overflow-x-auto scrollbar-none">
                {(["all", "videos", "shorts"] as FilterOption[]).map(
                  (filter) => {
                    const count =
                      filter === "all"
                        ? videos.length + shorts.length
                        : filter === "videos"
                        ? videos.length
                        : shorts.length;
                    return (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={cn(
                          "h-8 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0",
                          activeFilter === filter
                            ? "bg-foreground text-background"
                            : "bg-muted hover:bg-accent text-foreground"
                        )}
                      >
                        {filter === "all"
                          ? "All"
                          : filter === "videos"
                          ? "Videos"
                          : "Shorts"}{" "}
                        <span className="font-normal opacity-70">{count}</span>
                      </button>
                    );
                  }
                )}
              </div>

              {/* ── Videos list ── */}
              {showVideos && videos.length > 0 && (
                <section className="mb-8">
                  {activeFilter === "all" && (
                    <h2 className="mb-3 text-lg font-bold md:text-xl">
                      Videos <span className="font-normal text-muted-foreground">— {videos.length}</span>
                    </h2>
                  )}
                  <div className="space-y-0.5">
                    {videos.map((video, index) => {
                      // Rows are small; the first row shares the side panel's (larger) image so it downloads once
                      const thumb = youtubeThumb(ytId(video), index === 0 ? "medium" : "small");
                      return (
                        <div
                          key={video.id}
                          className="group flex items-center gap-2 rounded-xl py-1.5 transition-colors hover:bg-muted sm:gap-3 sm:pr-1"
                        >
                          {/* Index */}
                          <div className="hidden w-7 flex-shrink-0 select-none justify-center sm:flex">
                            <span className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
                          </div>

                          {/* Thumbnail */}
                          <Link
                            href={videoHref(video)}
                            className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-lg bg-muted"
                          >
                            <Image
                              src={thumb}
                              alt={video.title}
                              fill
                              {...imagePriorityProps(priorityForIndex(index), { preload: false })}
                              className="object-cover"
                            />
                            <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-px text-xs font-medium leading-4 text-white">
                              {video.duration}
                            </div>
                            <WatchedBar videoId={ytId(video)} />
                          </Link>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <Link href={videoHref(video)}>
                              <h3 className="line-clamp-2 break-words text-[15px] font-medium leading-5 md:text-base md:leading-[22px]">
                                {video.title}
                              </h3>
                            </Link>
                            <p className="mt-1 truncate text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5">
                              {video.channel}
                            </p>
                            <p className="text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5">
                              {video.views} · {video.timeAgo}
                            </p>
                          </div>

                          {/* Three-dot menu — always visible */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <MoreButton />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-60 rounded-xl py-2"
                            >
                              <DropdownMenuItem
                                onClick={() => saveToWatchLater(video)}
                              >
                                <Clock className="h-5 w-5" /> {isInWatchLater(video.id) ? "Remove from Watch later" : "Save to Watch later"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                afterClose={() => openSaveCard(video)}
                              >
                                <SaveIcon className="h-5 w-5" /> Save
                                to playlist
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => shareVideo(videoHref(video))}
                              >
                                <ShareIcon className="h-5 w-5" /> Share
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => removeVideo(video.id)}
                              >
                                <Trash2 className="h-5 w-5" /> Remove
                                from Liked Videos
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Shorts grid ── */}
              {showShorts && shorts.length > 0 && (
                <section>
                  {activeFilter === "all" && (
                    <h2 className="mb-3 text-lg font-bold md:text-xl">
                      Shorts <span className="font-normal text-muted-foreground">— {shorts.length}</span>
                    </h2>
                  )}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 min-[1400px]:grid-cols-4">
                    {shorts.map((short) => {
                      const thumb = `https://img.youtube.com/vi/${ytId(short)}/hqdefault.jpg`;
                      return (
                        <ShortCard
                          key={short.id}
                          href={`/shorts?v=${ytId(short)}`}
                          title={short.title}
                          views={`${short.views} views`}
                          thumbnail={thumb}
                          menu={
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <MoreButton />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-60 rounded-xl py-2"
                              >
                                <DropdownMenuItem
                                  onClick={() => saveToWatchLater(short)}
                                >
                                  <Clock className="h-5 w-5" /> {isInWatchLater(short.id) ? "Remove from Watch later" : "Save to Watch later"}
                              </DropdownMenuItem>
                                <DropdownMenuItem
                                  afterClose={() => openSaveCard(short)}
                                >
                                  <SaveIcon className="h-5 w-5" />{" "}
                                  Save to playlist
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => shareVideo(shortHref(short))}
                                >
                                  <ShareIcon className="h-5 w-5" /> Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => removeShort(short.id)}
                                >
                                  <Trash2 className="h-5 w-5" /> Remove
                                  from Liked Videos
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          }
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Empty state for active filter */}
              {((activeFilter === "videos" && videos.length === 0) ||
                (activeFilter === "shorts" && shorts.length === 0)) && (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No {activeFilter} liked yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
