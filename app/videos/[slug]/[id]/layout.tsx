import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { videoData } from "@/lib/video-data";
import { videoPath, videoSlug } from "@/lib/video-url";

// Links use the YouTube id; older links use the internal id
const findVideo = (id: string) => {
  const key = decodeURIComponent(id);
  return videoData.find((v) => v.videoId === key || v.id === key);
};

// Pre-render every video page at its readable address (/videos/<title-slug>/<YouTube id>, see lib/video-url.ts):
// links then prefetch it in full and it opens instantly
export function generateStaticParams() {
  return videoData.map((v) => ({ slug: videoSlug(v.title), id: v.videoId }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const video = findVideo(id);
  return video
    ? { title: video.title, description: video.description.slice(0, 160), alternates: { canonical: videoPath(video) } }
    : { title: "Video not found" };
}

export default async function VideoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const video = findVideo(id);
  if (!video) notFound();
  // Any other address for this video (old links with the channel name, the internal id, an edited title)
  // goes to the readable one, so the address bar and shared links always show it
  if (decodeURIComponent(slug) !== videoSlug(video.title) || decodeURIComponent(id) !== video.videoId) permanentRedirect(videoPath(video));
  return children;
}
