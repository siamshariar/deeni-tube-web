// lib/seo.ts
// What search engines and shared links (Facebook, WhatsApp, X, Telegram…) are told about each page: title, description, its one
// address (canonical), its picture, and structured data (schema.org). Pages call pageMeta in their layout.
import type { Metadata } from "next";
import type { ChannelItem } from "@/lib/channel-data";
import { mediaMeta } from "@/lib/media-meta";
import { findPlayable } from "@/lib/media-lookup";
import { absoluteUrl, INDEXED, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import { sharePath, shortPath } from "@/lib/share-path";
import type { ShortVideo } from "@/lib/shorts-data";
import type { VideoItem } from "@/lib/video-data";
import { videoPath } from "@/lib/video-url";

export interface ShareImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}
/** The cards in public/og (npm run og), 1200x630 */
export const ogCard = (name: string, alt: string): ShareImage => ({ url: `/og/${name}.jpg`, width: 1200, height: 630, alt });
const DEFAULT_CARD = ogCard("default", SITE_TITLE);

/** A video's or short's picture, as YouTube's own shared links: 1280x720 where it has one */
export function mediaImage(videoId: string, alt: string): ShareImage {
  return mediaMeta[videoId] && !mediaMeta[videoId].endsWith(" small")
    ? { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, width: 1280, height: 720, alt }
    : { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, width: 480, height: 360, alt };
}

/** One line without links and hashtags, cut between words */
export function plainText(text: string, max = 155): string {
  const line = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#[^\s#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40)).replace(/[\s,.;:।|-]+$/, "")}…`;
}

interface PageMeta {
  /** Without the site's name, which the browser tab gets too */
  title: string;
  description: string;
  /** Its one address */
  path: string;
  image?: ShareImage;
  type?: "website" | "article" | "profile" | "video.other";
  /** An embeddable player (YouTube's) */
  player?: string;
  /** Private or empty for others: kept out of search engines */
  noindex?: boolean;
}
export function pageMeta({ title, description, path, image = DEFAULT_CARD, type = "website", player, noindex }: PageMeta): Metadata {
  const full = title === SITE_TITLE ? title : `${title} - ${SITE_NAME}`;
  // On a shared link the site's name stands apart from the title
  const shared = type === "website" ? full : title;
  return {
    title: { absolute: full },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shared,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      type,
      images: [image],
      ...(player && { videos: [{ url: player, secureUrl: player, type: "text/html", width: 1280, height: 720 }] }),
    },
    twitter: { card: "summary_large_image", title: shared, description, images: [{ url: image.url, alt: image.alt }] },
    robots: noindex || !INDEXED ? { index: false, follow: !noindex || INDEXED } : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1, "max-snippet": -1 } },
  };
}

const sentence = (text: string) => (/[.!?।…]$/.test(text) ? text : `${text}.`);
// A video's own title first: many share one description
const mediaDescription = (m: { title: string; channel: string; description: string }, kind: string) => {
  const own = plainText(m.description, 300);
  const said = own && !m.title.includes(own) ? `${sentence(plainText(m.title, 80))} ${sentence(own)}` : sentence(plainText(m.title, 90));
  return plainText([...said].length < 110 ? `${said} ${kind} by ${m.channel} on ${SITE_NAME}.` : said);
};
/** What a channel or scholar says about itself, with what there is to see */
export const aboutDescription = (own: string | undefined, rest: string) => {
  const text = plainText(own ?? "");
  return text.length >= 100 ? text : plainText(text ? `${sentence(text)} ${rest}` : rest);
};

export function videoMeta(video: VideoItem): Metadata {
  return pageMeta({
    title: video.title,
    description: mediaDescription(video, "Islamic video"),
    path: videoPath(video),
    image: mediaImage(video.videoId, video.title),
    type: "video.other",
    player: `https://www.youtube.com/embed/${video.videoId}`,
  });
}
export function shortMeta(short: ShortVideo): Metadata {
  return pageMeta({
    title: short.title,
    description: mediaDescription(short, "Islamic Short"),
    path: shortPath(short.videoId),
    image: mediaImage(short.videoId, short.title),
    type: "video.other",
    player: `https://www.youtube.com/embed/${short.videoId}`,
  });
}

export { shortPath };

// ─── Structured data (schema.org) ─────────────────────────────────────────────

export const publishedAt = (videoId: string) => mediaMeta[videoId]?.split(" ")[0];
/** "1:16:28" → seconds */
export const durationSeconds = (duration: string) => duration.split(":").reduce((sum, part) => sum * 60 + (Number(part) || 0), 0);
function isoDuration(duration: string) {
  const s = durationSeconds(duration);
  const [h, m, sec] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  return s ? `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${sec || (!h && !m) ? `${sec}S` : ""}` : undefined;
}

type Json = Record<string, unknown>;
const ORGANIZATION: Json = { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png"), width: 512, height: 512 } };

export const websiteJson = (): Json => ({
  "@context": "https://schema.org",
  "@graph": [
    ORGANIZATION,
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: ["en", "bn"],
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" },
    },
  ],
});

/** [name, path] from the first page in */
export const breadcrumbsJson = (trail: [name: string, path: string][]): Json => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absoluteUrl(path) })),
});

export function videoJson(media: { videoId: string; title: string; channel: string; description: string; duration: string; channelSlug?: string }, path: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: media.title,
    description: plainText(media.description, 300) || media.title,
    thumbnailUrl: [mediaImage(media.videoId, "").url, `https://i.ytimg.com/vi/${media.videoId}/hqdefault.jpg`],
    uploadDate: publishedAt(media.videoId),
    duration: isoDuration(media.duration),
    embedUrl: `https://www.youtube.com/embed/${media.videoId}`,
    url: absoluteUrl(path),
    author: { "@type": "Person", name: media.channel, ...(media.channelSlug && { url: absoluteUrl(`/channels/${media.channelSlug}`) }) },
    publisher: ORGANIZATION,
    isFamilyFriendly: true,
  };
}

export const profileJson = (kind: "Organization" | "Person", p: { name: string; avatar: string; description?: string }, path: string): Json => ({
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: absoluteUrl(path),
  mainEntity: { "@type": kind, name: p.name, url: absoluteUrl(path), image: p.avatar, ...(p.description && { description: plainText(p.description, 300) }) },
});
export const channelJson = (c: ChannelItem) => profileJson("Organization", c, `/channels/${c.slug}`);

export const listJson = (name: string, path: string, videoIds: string[]): Json => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  url: absoluteUrl(path),
  numberOfItems: videoIds.length,
  itemListElement: videoIds.flatMap((id, i) => {
    const m = findPlayable(id);
    return m ? [{ "@type": "ListItem", position: i + 1, name: m.title, url: absoluteUrl(sharePath(m)) }] : [];
  }),
});
