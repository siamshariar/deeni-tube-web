// app/channels/[slug]/page.tsx
"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import { PageBar } from "@/components/page-bar";
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
import { channelData, subscribersText, type ChannelItem } from "@/lib/channel-data";
import { compactNumber, countText } from "@/lib/format";

export default function ChannelDetailPage() {
  const params = useParams();
  const channel = channelData.find((ch) => ch.slug === (params.slug as string));
  // The [slug] layout already returns a 404 for unknown channels; this is a safety net
  if (!channel) notFound();
  // Keyed so the tab resets when moving between channels
  return <ChannelView key={channel.id} channel={channel} />;
}

function ChannelView({ channel }: { channel: ChannelItem }) {
  const { videos, topics } = useChannelMedia(channel.id);
  const [tab, setTab] = useState<ProfileTab>("videos");



  // Strip YouTube's fcrop64 crop instruction to get the full 16:9 banner
  const fullBannerUrl = channel.banner ? channel.banner.replace(/=.*$/, "=w1920") : "/vibrant-health-cover.png";

  return (
    <div className="min-h-screen bg-background pt-14">
      <PageBar title={channel.name} parent="/channels" />

      {/* One banner image per screen size: the browser downloads only the matching source.
          Mobile uses the original fcrop64 strip (~6:1, natural height); desktop uses the full
          =w1920 banner at a fixed height. Eager because it's at the top; not high priority because
          on mobile the main image is the first video, and they would compete for bandwidth. */}
      <div className="relative bg-muted md:mx-6 md:mt-4 md:h-44 md:overflow-hidden md:rounded-2xl lg:h-52 xl:h-56">
        <picture>
          <source media="(min-width: 768px)" srcSet={fullBannerUrl} />
          <img
            src={channel.banner || "/vibrant-health-cover.png"}
            alt=""
            width={1707}
            height={282}
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            className="block h-auto w-full md:h-full md:object-cover"
          />
        </picture>
      </div>

      <ProfileHeader kind="channel" name={channel.name} avatar={channel.avatar} verified={channel.verified} channelId={channel.id}>
        {/* One line from md up; on phones the handle has its own, as in YouTube's app */}
        <p className="[overflow-wrap:anywhere]">
          <span className="font-medium text-foreground max-md:block">@{channel.slug}</span> <span aria-hidden="true" className="max-md:hidden">•</span>{" "}
          <span className="whitespace-nowrap">
            {subscribersText(channel.id)} <span aria-hidden="true">•</span> {countText(videos.length, "video")}
          </span>
        </p>
      </ProfileHeader>

      <ProfileTabs value={tab} onChange={setTab} />

      <ProfilePanel tab={tab}>
        {tab === "videos" && <ProfileVideos videos={videos} of="channel" />}
        {tab === "shorts" && <ProfileShorts channelId={channel.id} of="channel" />}
        {tab === "playlists" && <ProfilePlaylists channelId={channel.id} of="channel" />}
        {tab === "about" && (
          <div className="max-w-3xl px-3 py-4 md:px-6 md:py-6">
            <ProfileAbout
              description={channel.description || "No description provided."}
              stats={[
                { value: compactNumber(channel.subscribers, 3), label: "Subscribers" },
                { value: LANGUAGE_NAMES[channel.language] ?? channel.language, label: "Language" },
                { value: String(videos.length), label: videos.length === 1 ? "Video" : "Videos" },
              ]}
              topics={topics}
            />
          </div>
        )}
      </ProfilePanel>
    </div>
  );
}
