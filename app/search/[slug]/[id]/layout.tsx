import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { findVideoByRoute, searchVideoPath, videoPath, videoSlug } from "@/lib/video-url";
import { videoData } from "@/lib/video-data";

// Pre-rendered, as the pages under /videos, so a result opens at once
export function generateStaticParams() {
  return videoData.map((v) => ({ slug: videoSlug(v.title), id: v.videoId }));
}

// One video, one address for search engines and shared links: the one under /videos
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const video = findVideoByRoute((await params).id);
  return video
    ? { title: video.title, description: video.description.slice(0, 160), alternates: { canonical: videoPath(video) } }
    : { title: "Video not found" };
}

export default async function SearchVideoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const video = findVideoByRoute(id);
  if (!video) notFound();
  if (decodeURIComponent(slug) !== videoSlug(video.title) || decodeURIComponent(id) !== video.videoId) permanentRedirect(searchVideoPath(video));
  return children;
}
