// components/scholar-about.tsx
// A scholar's About content: stats, description and topics. Shown instantly by the About tab on the
// scholar page (no navigation) and by the standalone /scholars/[slug]/about page.
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { DescriptionText } from "@/components/description-text";
import type { ScholarItem } from "@/lib/scholar-data";
import type { VideoItem } from "@/lib/video-data";

const languageNames: Record<string, string> = {
  bn: "Bangla",
  en: "English",
  ar: "Arabic",
  ur: "Urdu",
  hi: "Hindi",
  tr: "Turkish",
};

export function scholarTopics(videos: VideoItem[]) {
  return Array.from(new Set(videos.map((v) => v.category))).filter(Boolean);
}

export function ScholarAbout({ scholar, videos }: { scholar: ScholarItem; videos: VideoItem[] }) {
  const topics = scholarTopics(videos);
  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-muted p-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{videos.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Videos</p>
        </div>
        <div className="border-x border-border text-center">
          <p className="text-2xl font-bold capitalize">{languageNames[scholar.language] || scholar.language}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Primary language</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{topics.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Topics</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="h-5 w-5" />
          About
        </h2>
        <DescriptionText
          text={scholar.description || `${scholar.name} is a distinguished Islamic scholar known for ${scholar.designation}.`}
          className="text-sm leading-relaxed text-foreground/80"
        />
      </section>

      {topics.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Topics covered</h2>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                key={topic}
                href={`/categories/${topic.toLowerCase().replace(/\s+/g, "-")}`}
                className="inline-flex h-8 items-center rounded-lg bg-muted px-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                {topic}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
