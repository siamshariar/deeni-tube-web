// app/scholars/[slug]/scholar-view.tsx
// A scholar's page. Rendered by both /scholars/[slug] (the profile with Videos/Shorts/Playlists tabs) and
// /scholars/[slug]/about (the About page); which one shows follows the URL. The About tab switches with
// history.pushState, which Next.js syncs with usePathname: the URL changes to .../about and the About page
// shows instantly, with no request or page load (also in dev, where routes compile on first visit).
"use client";

import { useState, useRef } from "react";
import { notFound, useParams, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { DurationBadge } from "@/components/duration-badge";
import { RowMeta } from "@/components/media-details";
import { PageBar } from "@/components/page-bar";
import { ROW_DETAILS, ROW_THUMB, ROW_TITLE, SECTION_TITLE } from "@/components/page-layout";
import {
  LANGUAGE_NAMES,
  ProfileAbout,
  ProfileHeader,
  ProfilePanel,
  ProfilePlaylists,
  ProfileShorts,
  ProfileTabs,
  ProfileVideos,
  useChannelMedia,
  type ProfileTab,
} from "@/components/profile";
import { WatchedBar } from "@/components/watched-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { countText } from "@/lib/format";
import { youtubeThumb } from "@/lib/media-lookup";
import { scholarData, type ScholarItem } from "@/lib/scholar-data";
import { videoPath } from "@/lib/video-url";
import { cn } from "@/lib/utils";

export default function ScholarView() {
  const params = useParams();
  const scholar = scholarData.find((s) => s.slug === (params.slug as string));
  // The [slug] layout already returns a 404 for unknown scholars; this is a safety net
  if (!scholar) notFound();
  return <ScholarProfile key={scholar.id} scholar={scholar} />;
}

function ScholarProfile({ scholar }: { scholar: ScholarItem }) {
  const { slug } = scholar;
  const { videos, shorts, topics } = useChannelMedia(scholar.channelId);
  const [tab, setTab] = useState<ProfileTab>("videos");
  const pathname = usePathname();
  const showAbout = !!pathname?.endsWith("/about");
  // Set when the About page was opened from the profile, so going back returns to that history entry
  const openedAboutRef = useRef(false);


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

  const description = scholar.description || `${scholar.name} is a distinguished Islamic scholar known for ${scholar.designation}.`;

  // ── About page ──
  if (showAbout) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <PageBar title={`About ${scholar.name}`} parent={`/scholars/${slug}`} onBack={showProfile} />

        <div className="mx-auto max-w-3xl px-3 py-4 md:px-6 md:py-6">
          <div className="mb-6 flex items-center gap-4 max-[399px]:flex-col max-[399px]:gap-3 max-[399px]:text-center md:gap-6">
            <Avatar className="h-20 w-20 flex-shrink-0 max-[399px]:h-24 max-[399px]:w-24 md:h-24 md:w-24">
              <AvatarImage src={scholar.avatar} alt="" className="object-cover" />
              <AvatarFallback className="text-2xl">{scholar.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-7 [overflow-wrap:anywhere] md:text-2xl md:leading-8">{scholar.name}</h1>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{scholar.designation}</p>
            </div>
          </div>

          <div className="mb-8">
            <ProfileAbout
              description={description}
              stats={[
                { value: String(videos.length), label: videos.length === 1 ? "Video" : "Videos" },
                { value: LANGUAGE_NAMES[scholar.language] ?? scholar.language, label: "Language" },
                { value: String(topics.length), label: topics.length === 1 ? "Topic" : "Topics" },
              ]}
              topics={topics}
            />
          </div>

          {videos.length > 0 && (
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className={SECTION_TITLE}>Recent videos</h2>
                <button type="button" onClick={showProfile} className="text-sm font-medium text-[#065fd4] dark:text-[#3ea6ff]">
                  See all
                </button>
              </div>
              <div className="space-y-3">
                {videos.slice(0, 3).map((video) => (
                  <Link key={video.id} href={videoPath(video)} className="flex gap-3">
                    <div className={cn(ROW_THUMB, "relative aspect-video self-start overflow-hidden rounded-lg bg-muted")}>
                      <Image src={youtubeThumb(video.videoId, "small")} alt="" fill sizes="160px" className="object-cover" />
                      <DurationBadge>{video.duration}</DurationBadge>
                      <WatchedBar videoId={video.videoId} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={ROW_TITLE}>{video.title}</p>
                      <RowMeta views={video.views} timeAgo={video.timeAgo} className={cn("mt-1", ROW_DETAILS)} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <Button variant="outline" className="w-full" onClick={showProfile}>
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
              knowsAbout: topics,
              inLanguage: scholar.language,
            }),
          }}
        />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background pt-14">
      <PageBar title={scholar.name} parent="/scholars" />

      <ProfileHeader kind="scholar" name={scholar.name} avatar={scholar.avatar} channelId={scholar.channelId}>
        <p>{scholar.designation}</p>
        <p>
          {countText(videos.length, "video")} <span aria-hidden="true">•</span> {countText(shorts.length, "short")}
        </p>
      </ProfileHeader>

      {/* About opens the About page (instantly, see openAbout); the other tabs switch in place */}
      <ProfileTabs value={tab} onChange={(next) => (next === "about" ? openAbout() : setTab(next))} />

      <ProfilePanel tab={tab}>
        {tab === "videos" && <ProfileVideos videos={videos} of="scholar" />}
        {tab === "shorts" && <ProfileShorts channelId={scholar.channelId} of="scholar" />}
        {tab === "playlists" && <ProfilePlaylists channelId={scholar.channelId} of="scholar" />}
      </ProfilePanel>
    </div>
  );
}
