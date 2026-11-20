import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { notFound } from "next/navigation";
import { channelData } from "@/lib/channel-data";

const findChannel = (slug: string) => channelData.find((c) => c.slug === decodeURIComponent(slug));

// Pre-rendered at build time so links prefetch them in full and they open instantly
export function generateStaticParams() {
  return channelData.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: pageTitle(findChannel(slug)?.name ?? "Channel not found") };
}

// Unknown channels get the not-found page (the page itself is a client component)
export default async function ChannelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!findChannel(slug)) notFound();
  return children;
}
