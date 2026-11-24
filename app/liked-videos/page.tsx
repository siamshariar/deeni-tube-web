// app/liked-videos/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, Trash2 } from "lucide-react";
import type { MenuAction } from "@/components/action-menu";
import { EmptyState } from "@/components/empty-state";
import { LibraryChips, LibraryPage, LibraryRow, LibraryShorts, LibraryTitle, savedHref, type LibraryFilter } from "@/components/library";
import { Button } from "@/components/ui/button";
import { useLikedVideos, type LikedVideo } from "@/hooks/useLikedVideos";
import { useHydrated } from "@/lib/local-store";
import { mediaThumb } from "@/lib/media-lookup";
import { notify } from "@/lib/notify";

export default function LikedVideosPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { likedVideos, unlike } = useLikedVideos();
  const videos = useMemo(() => likedVideos.filter((v) => v.type !== "short"), [likedVideos]);
  const shorts = useMemo(() => likedVideos.filter((v) => v.type === "short"), [likedVideos]);
  const [filter, setFilter] = useState<LibraryFilter>("all");

  const extra = (v: LikedVideo): MenuAction[] => [
    {
      id: "remove",
      label: "Remove from Liked videos",
      icon: Trash2,
      danger: true,
      onSelect: () => notify("Removed from Liked videos", { undo: unlike(v.id), thumb: mediaThumb(v.id) }),
    },
  ];

  const cover = videos[0] ?? shorts[0];
  const playAll = () => cover && router.push(savedHref(cover));
  const shuffle = () => {
    const list = videos.length ? videos : shorts;
    const pick = list[Math.floor(Math.random() * list.length)];
    if (pick) router.push(savedHref(pick));
  };

  return (
    <div className="min-h-screen bg-background pt-14 md:pt-16">
      <div className="px-3 pb-8 md:px-6 md:py-6">
        {!hydrated ? null : !cover ? (
          <EmptyState as="h1" icon={ThumbsUp} title="No liked videos" description="Videos you like will appear here">
            <Button onClick={() => router.push("/")}>Browse videos</Button>
          </EmptyState>
        ) : (
          <LibraryPage icon={ThumbsUp} title="Liked videos" videos={videos} shorts={shorts} onPlayAll={playAll} onShuffle={shuffle}>
            <LibraryChips videos={videos.length} shorts={shorts.length} value={filter} onChange={setFilter} />

            {filter !== "shorts" && videos.length > 0 && (
              <section className="mb-8">
                {filter === "all" && <LibraryTitle count={videos.length}>Videos</LibraryTitle>}
                <div className="space-y-0.5">
                  {videos.map((video, index) => (
                    <LibraryRow key={video.id} video={video} index={index} extra={extra(video)} />
                  ))}
                </div>
              </section>
            )}

            {filter !== "videos" && shorts.length > 0 && (
              <section>
                {filter === "all" && <LibraryTitle count={shorts.length}>Shorts</LibraryTitle>}
                <LibraryShorts shorts={shorts} extra={extra} />
              </section>
            )}

            {((filter === "videos" && videos.length === 0) || (filter === "shorts" && shorts.length === 0)) && (
              <EmptyState icon={ThumbsUp} title={`No liked ${filter}`} />
            )}
          </LibraryPage>
        )}
      </div>
    </div>
  );
}
