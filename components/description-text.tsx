// components/description-text.tsx
// Description text for videos, shorts, channels and scholars. It keeps the line breaks, wraps long
// words and links so they never run off the screen (`overflow-wrap: anywhere` also stops them from
// widening a grid or flex parent), and turns URLs and #hashtags into links, as on YouTube.
import Link from "next/link";
import { cn } from "@/lib/utils";

// A URL (without trailing punctuation) or a hashtag. One capture group, so split() puts the matches
// at the odd indexes.
const TOKEN = /(https?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]}'"]|#[^\s#.,;:!?()[\]{}"']+)/g;

const LINK = "text-[#065fd4] dark:text-[#3ea6ff]";

/** Search link for a hashtag: "#ইসলামিক_আলোচনা" → /search?q=ইসলামিক আলোচনা */
export function hashtagHref(tag: string) {
  return `/search?q=${encodeURIComponent(tag.replace(/^#/, "").replace(/_/g, " "))}`;
}

export function DescriptionText({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  return (
    <div className={cn("whitespace-pre-wrap [overflow-wrap:anywhere]", className)}>
      {text.split(TOKEN).map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith("#")) return <Link key={i} href={hashtagHref(part)} className={LINK}>{part}</Link>;
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={LINK}>{part}</a>;
      })}
    </div>
  );
}
