// components/profile.tsx
// What a channel's and a scholar's page are made of, so the two look and work the same: the picture, name, details and
// buttons, the tabs (which stay under the app bar on phones), and the Videos, Shorts, Playlists and About tabs.
"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Flag, GraduationCap, ListVideo, Play, PlaySquare } from "lucide-react";
import { ActionMenu } from "@/components/action-menu";
import { DescriptionText } from "@/components/description-text";
import { EmptyState } from "@/components/empty-state";
import { HomeFeedButton } from "@/components/home-feed-button";
import { ShareIcon } from "@/components/icons/action-icons";
import { VerifiedName } from "@/components/icons/verified-icon";
import { CHIP, CHIP_OFF, SECTION_TITLE } from "@/components/page-layout";
import { PLAYLIST_GRID, PlaylistCard } from "@/components/playlist-card";
import ShortCard, { SHORTS_GRID } from "@/components/short-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoGrid from "@/components/video-grid";
import { openReport, openShare } from "@/lib/dialogs";
import { viewsText } from "@/lib/format";
import { extendedPlaylists } from "@/lib/playlist-data";
import { shortsOfChannel } from "@/lib/shorts-data";
import { videoData, type VideoItem } from "@/lib/video-data";

export const LANGUAGE_NAMES: Record<string, string> = { bn: "Bangla", en: "English", ar: "Arabic", ur: "Urdu", hi: "Hindi", tr: "Turkish" };

/** Everything of a channel: its videos, shorts, the public playlists that hold its videos, and its topics. */
export function useChannelMedia(channelId: string) {
  return useMemo(() => {
    const videos = videoData.filter((v) => v.channelId === channelId);
    const ids = new Set(videos.map((v) => v.id));
    return {
      videos,
      shorts: shortsOfChannel(channelId),
      // Never the visitor's own Watch later or Liked videos
      playlists: extendedPlaylists.filter((pl) => pl.isPublic && pl.videoIds.some((id) => ids.has(id))),
      topics: topicsOf(videos),
    };
  }, [channelId]);
}

export const topicsOf = (videos: VideoItem[]) => Array.from(new Set(videos.map((v) => v.category))).filter(Boolean);

// ── Header ───────────────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  kind: "channel" | "scholar";
  name: string;
  avatar: string;
  verified?: boolean;
  /** Lines under the name */
  children: ReactNode;
  channelId: string;
}

export function ProfileHeader({ kind, name, avatar, verified, children, channelId }: ProfileHeaderProps) {
  return (
    <header className="px-3 pb-3 pt-4 md:px-6 md:pb-4 md:pt-6">
      {/* Phones under 400px: the picture on top and the rest under it, in the middle */}
      <div className="flex items-center gap-4 max-[399px]:flex-col max-[399px]:gap-3 max-[399px]:text-center md:gap-6">
        <Avatar className="h-20 w-20 flex-shrink-0 max-[399px]:h-24 max-[399px]:w-24 md:h-40 md:w-40">
          <AvatarImage src={avatar} alt="" className="object-cover" />
          <AvatarFallback className="text-2xl">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 max-[399px]:w-full">
          <h1 className="text-xl font-bold leading-7 [overflow-wrap:anywhere] md:text-4xl md:leading-[44px]">
            <VerifiedName name={name} verified={verified} className="ml-1.5 h-[18px] w-[18px] align-[-2px] md:ml-2 md:h-6 md:w-6 md:align-[-1px]" />
          </h1>
          <div className="mt-1 space-y-0.5 text-sm leading-5 text-muted-foreground">{children}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 max-[399px]:justify-center">
            <HomeFeedButton channelId={channelId} name={name} align="start" />
            <Button variant="secondary" className="h-9 bg-muted pl-3 pr-4 hover:bg-accent [&_svg]:size-5" onClick={() => openShare(window.location.href, name)}>
              <ShareIcon /> Share
            </Button>
            <ActionMenu
              title={kind === "channel" ? "Channel actions" : "Scholar actions"}
              align="start"
              actions={[
                { id: "report", label: "Report", icon: Flag, opens: true, onSelect: () => openReport(kind, name) },
              ]}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

export type ProfileTab = "videos" | "shorts" | "playlists" | "about";
const TABS: { value: ProfileTab; label: string }[] = [
  { value: "videos", label: "Videos" },
  { value: "shorts", label: "Shorts" },
  { value: "playlists", label: "Playlists" },
  { value: "about", label: "About" },
];

/** Under the app bar on phones they stay in view while the page scrolls. */
export function ProfileTabs({ value, onChange }: { value: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ProfileTab)} className="sticky top-[104px] z-[9] border-b bg-background low:top-14 md:static">
      <TabsList className="flex h-12 w-full justify-start overflow-x-auto rounded-none bg-transparent p-0 scrollbar-none md:px-3">
        {TABS.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            id={`profile-tab-${t.value}`}
            aria-controls="profile-panel"
            className="h-12 rounded-none border-b-2 border-transparent px-3 text-base font-medium text-muted-foreground transition-colors data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none can-hover:hover:border-muted-foreground/40 can-hover:hover:text-foreground data-[state=active]:can-hover:hover:border-foreground md:px-4"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** The chosen tab's contents */
export function ProfilePanel({ tab, children }: { tab: ProfileTab; children: ReactNode }) {
  return (
    <div role="tabpanel" id="profile-panel" aria-labelledby={`profile-tab-${tab}`}>
      {children}
    </div>
  );
}

// ── Tab contents ─────────────────────────────────────────────────────────────

export function ProfileVideos({ videos, of }: { videos: VideoItem[]; of: string }) {
  if (!videos.length) return <EmptyState icon={Play} title="No videos yet" description={`This ${of} has no videos here.`} />;
  return (
    <>
      <h2 className="sr-only">Videos</h2>
      <VideoGrid videos={videos} className="py-4 md:px-6 md:py-6" />
    </>
  );
}

export function ProfileShorts({ channelId, of }: { channelId: string; of: string }) {
  const { shorts } = useChannelMedia(channelId);
  if (!shorts.length) return <EmptyState icon={PlaySquare} title="No shorts yet" description={`This ${of} has no shorts here.`} />;
  return (
    <div className={`${SHORTS_GRID} px-3 py-4 md:px-6 md:py-6`}>
      <h2 className="sr-only">Shorts</h2>
      {shorts.map((s) => (
        <ShortCard key={s.id} scope="suggested" short={{ ...s, views: viewsText(s.views) }} />
      ))}
    </div>
  );
}

export function ProfilePlaylists({ channelId, of }: { channelId: string; of: string }) {
  const { playlists } = useChannelMedia(channelId);
  if (!playlists.length) return <EmptyState icon={ListVideo} title="No playlists yet" description={`This ${of} has no playlists here.`} />;
  return (
    <div className={`${PLAYLIST_GRID} px-3 py-4 md:px-6 md:py-6`}>
      <h2 className="sr-only">Playlists</h2>
      {playlists.map((pl) => (
        <PlaylistCard key={pl.id} playlist={pl} ofChannel />
      ))}
    </div>
  );
}

interface ProfileAboutProps {
  description: string;
  stats: { value: string; label: string }[];
  topics: string[];
}

export function ProfileAbout({ description, stats, topics }: ProfileAboutProps) {
  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-muted p-4">
        {stats.map((s, i) => (
          <div key={s.label} className={i === 1 ? "flex flex-col-reverse border-x border-border text-center" : "flex flex-col-reverse text-center"}>
            <dt className="mt-0.5 text-xs leading-4 text-muted-foreground">{s.label}</dt>
            <dd className="text-xl font-bold leading-7 [overflow-wrap:anywhere] md:text-2xl md:leading-8">{s.value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h2 className={`${SECTION_TITLE} mb-3 flex items-center gap-2`}>
          <GraduationCap className="h-5 w-5" aria-hidden="true" /> About
        </h2>
        <DescriptionText text={description} className="text-sm leading-relaxed text-foreground/80" />
      </section>
      {topics.length > 0 && (
        <section>
          <h2 className={`${SECTION_TITLE} mb-3`}>Topics covered</h2>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link key={topic} href={`/categories/${topic.toLowerCase().replace(/\s+/g, "-")}`} className={`${CHIP} ${CHIP_OFF}`}>
                {topic}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
