import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbsJson, videoJson, videoMeta } from "@/lib/seo";
import { categoryData, videoData } from "@/lib/video-data";
import { findVideoByRoute, videoPath, videoSlug } from "@/lib/video-url";

// Pre-render every video page at its readable address (/videos/<title-slug>/<YouTube id>, see lib/video-url.ts):
// links then prefetch it in full and it opens instantly
export function generateStaticParams() {
  return videoData.map((v) => ({ slug: videoSlug(v.title), id: v.videoId }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const video = findVideoByRoute(id);
  return video ? videoMeta(video) : { title: "Video not found" };
}

export default async function VideoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const video = findVideoByRoute(id);
  if (!video) notFound();
  // Any other address for this video (old links with the channel name, the internal id, an edited title)
  // goes to the readable one, so the address bar and shared links always show it
  if (decodeURIComponent(slug) !== videoSlug(video.title) || decodeURIComponent(id) !== video.videoId) permanentRedirect(videoPath(video));
  const category = categoryData.find((c) => c.name === video.category);
  return (
    <>
      <JsonLd data={[
        videoJson(video, videoPath(video)),
        breadcrumbsJson([["Home", "/"], ...(category ? [[category.name, `/categories/${category.slug}`] as [string, string]] : []), [video.title, videoPath(video)]]),
      ]} />
      {children}
    </>
  );
}
