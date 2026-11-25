import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { channelData } from "@/lib/channel-data";
import { aboutDescription, breadcrumbsJson, channelJson, ogCard, pageMeta } from "@/lib/seo";

const findChannel = (slug: string) => channelData.find((c) => c.slug === decodeURIComponent(slug));

// Pre-rendered at build time so links prefetch them in full and they open instantly
export function generateStaticParams() {
  return channelData.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const channel = findChannel(slug);
  if (!channel) return { title: pageTitle("Channel not found") };
  return pageMeta({
    title: channel.name,
    description: aboutDescription(channel.description, `Watch Islamic videos, Shorts and playlists from ${channel.name} on Deeni.tube.`),
    path: `/channels/${channel.slug}`,
    image: ogCard(`channel-${channel.slug}`, channel.name),
    type: "profile",
  });
}

// Unknown channels get the not-found page (the page itself is a client component)
export default async function ChannelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = findChannel(slug);
  if (!channel) notFound();
  return (
    <>
      <JsonLd data={[channelJson(channel), breadcrumbsJson([["Home", "/"], ["Channels", "/channels"], [channel.name, `/channels/${channel.slug}`]])]} />
      {children}
    </>
  );
}
