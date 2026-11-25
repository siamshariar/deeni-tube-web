// app/shorts/[id]/page.tsx
// One short, at its own address as on YouTube (/shorts/<id>): what it is shared with, so the link shows its picture and title.
// The page is the Shorts feed, opened at it.
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import ShortsPage from "../page";
import { JsonLd } from "@/components/json-ld";
import { channelData } from "@/lib/channel-data";
import { pageTitle } from "@/lib/page-title";
import { breadcrumbsJson, shortMeta, shortPath, videoJson } from "@/lib/seo";
import { removedShorts, replacedShorts, shortsVideos } from "@/lib/shorts-data";

const findShort = (id: string) => shortsVideos.find((s) => s.videoId === decodeURIComponent(id));

export function generateStaticParams() {
  return shortsVideos.map((s) => ({ id: s.videoId }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const short = findShort((await params).id);
  return short ? shortMeta(short) : { title: pageTitle("Short not found") };
}

export default async function ShortPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const short = findShort(id);
  if (!short) {
    if (replacedShorts[id]) permanentRedirect(shortPath(replacedShorts[id]));
    if (removedShorts.has(id)) permanentRedirect("/shorts");
    notFound();
  }
  const channel = channelData.find((c) => c.id === short.channelId);
  return (
    <>
      <JsonLd data={[videoJson({ ...short, channelSlug: channel?.slug }, shortPath(id)), breadcrumbsJson([["Home", "/"], ["Shorts", "/shorts"], [short.title, shortPath(id)]])]} />
      <ShortsPage />
    </>
  );
}
