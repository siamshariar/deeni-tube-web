import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { findPlayable } from "@/lib/media-lookup";
import { extendedPlaylists } from "@/lib/playlist-data";
import { breadcrumbsJson, listJson, mediaImage, pageMeta, plainText } from "@/lib/seo";

// The site's own public playlists. (A visitor's own are on their device only: nothing to show others or search engines.)
const findPublic = (id: string) => extendedPlaylists.find((p) => p.id === decodeURIComponent(id) && p.isPublic);
const pathOf = (p: { slug: string; id: string }) => `/playlists/${p.slug}/${p.id}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const playlist = findPublic(id);
  if (!playlist) return pageMeta({ title: "Playlist", description: "A playlist on Deeni.tube.", path: pathOf({ slug, id }), noindex: true });
  const videos = playlist.videoIds.map(findPlayable).filter((v) => v !== undefined);
  const channels = [...new Set(videos.map((v) => v.channel))];
  const from = channels.length > 2 ? `${channels[0]} and others` : channels.join(" and ");
  return pageMeta({
    title: playlist.name,
    description: plainText(`${playlist.name}: a playlist of ${videos.length} Islamic ${videos.length === 1 ? "video" : "videos"}${from ? ` from ${from}` : ""}. Watch it in order on Deeni.tube.`),
    path: pathOf(playlist),
    image: videos[0] && mediaImage(videos[0].videoId, playlist.name),
    type: "video.other",
  });
}

export default async function PlaylistLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const playlist = findPublic((await params).id);
  return (
    <>
      {playlist && <JsonLd data={[listJson(playlist.name, pathOf(playlist), playlist.videoIds), breadcrumbsJson([["Home", "/"], ["Playlists", "/playlists"], [playlist.name, pathOf(playlist)]])]} />}
      {children}
    </>
  );
}
