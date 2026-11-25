// app/scholars/page.tsx
"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LanguageChips, useLanguageFilter } from "@/components/language-chips";
import { LIST_SEARCH, ListHeader } from "@/components/list-header";
import { PAGE, ROW_DETAILS } from "@/components/page-layout";
import { PERSON_LIST, PersonItem } from "@/components/person-item";
import { SearchField } from "@/components/search-field";
import { SortDropdown } from "@/components/sort-dropdown";
import { countText } from "@/lib/format";
import { scholarData } from "@/lib/scholar-data";
import { videoData } from "@/lib/video-data";
import { filterIn } from "@/lib/search-match";

const SORT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Name (A-Z)", value: "name-asc" },
  { label: "Name (Z-A)", value: "name-desc" },
  { label: "Most videos", value: "videos" },
] as const;
type Sort = (typeof SORT_OPTIONS)[number]["value"];

const LANGUAGES = scholarData.map((s) => s.language);
const videosOf = (channelId: string) => videoData.filter((v) => v.channelId === channelId).length;

export default function ScholarsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const languages = useLanguageFilter(LANGUAGES);


  const scholars = filterIn(scholarData.filter((s) => languages.selected.includes(s.language)), searchQuery, (s) => [s.name, s.designation])
    .sort((a, b) => (sort === "name-asc" ? a.name.localeCompare(b.name) : sort === "name-desc" ? b.name.localeCompare(a.name) : sort === "videos" ? videosOf(b.channelId) - videosOf(a.channelId) : 0));

  return (
    <div className="min-h-screen bg-background">
      <div className={PAGE}>
        <ListHeader title="Scholars">
          <SearchField value={searchQuery} onChange={setSearchQuery} label="Search scholars" className={LIST_SEARCH} />
          <SortDropdown options={SORT_OPTIONS} currentValue={sort} onSelect={setSort} />
        </ListHeader>

        <LanguageChips filter={languages} />
        <h2 className="sr-only">All scholars</h2>

        {scholars.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No scholars found" description="Try another language or different keywords" />
        ) : (
          <ul className={PERSON_LIST}>
            {scholars.map((s) => (
              <PersonItem key={s.id} href={`/scholars/${s.slug}`} avatar={s.avatar} name={s.name} details={s.designation}>
                <span className={`hidden flex-shrink-0 sm:block ${ROW_DETAILS}`}>{countText(videosOf(s.channelId), "video")}</span>
              </PersonItem>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
