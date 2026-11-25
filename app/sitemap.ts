import type { MetadataRoute } from "next";
import { channelData } from "@/lib/channel-data";
import { findPlayable } from "@/lib/media-lookup";
import { extendedPlaylists } from "@/lib/playlist-data";
import { scholarData } from "@/lib/scholar-data";
import { durationSeconds, mediaImage, plainText, publishedAt, shortPath } from "@/lib/seo";
import { shortsVideos } from "@/lib/shorts-data";
import { absoluteUrl } from "@/lib/site";
import { categoryData, videoData } from "@/lib/video-data";
import { videoPath } from "@/lib/video-url";

// (Next.js writes the texts as they are)
const xml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function video(m: { videoId: string; title: string; channel: string; description: string; duration: string }, path: string): MetadataRoute.Sitemap[number] {
  const date = publishedAt(m.videoId);
  return {
    url: absoluteUrl(path),
    ...(date && { lastModified: date }),
    changeFrequency: "monthly",
    priority: 0.8,
    images: [mediaImage(m.videoId, "").url],
    videos: [
      {
        title: xml(m.title),
        thumbnail_loc: mediaImage(m.videoId, "").url,
        description: xml(plainText(m.description, 300) || `${m.title} - ${m.channel}`),
        player_loc: `https://www.youtube.com/embed/${m.videoId}`,
        duration: durationSeconds(m.duration) || undefined,
        publication_date: date,
        family_friendly: "yes",
      },
    ],
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") => ({ url: absoluteUrl(path), priority, changeFrequency });
  return [
    page("/", 1, "daily"),
    ...["/shorts", "/channels", "/scholars", "/categories", "/playlists"].map((p) => page(p, 0.9, "daily")),
    ...["/more/about", "/donate", "/help", "/help/get-started", "/help/guidelines", "/help/privacy", "/help/terms", "/more", "/more/rate", "/more/suggest"].map((p) => page(p, 0.3, "monthly")),
    ...categoryData.map((c) => page(`/categories/${c.slug}`, 0.7)),
    ...channelData.map((c) => page(`/channels/${c.slug}`, 0.8)),
    ...scholarData.flatMap((s) => [page(`/scholars/${s.slug}`, 0.8), page(`/scholars/${s.slug}/about`, 0.4, "monthly")]),
    ...extendedPlaylists.filter((p) => p.isPublic && p.videoIds.some((id) => findPlayable(id))).map((p) => page(`/playlists/${p.slug}/${p.id}`, 0.6)),
    ...videoData.map((v) => video(v, videoPath(v))),
    ...shortsVideos.map((s) => video(s, shortPath(s.videoId))),
  ];
}
