// app/categories/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LanguageChips, useLanguageFilter } from "@/components/language-chips";
import { LIST_SEARCH, ListHeader } from "@/components/list-header";
import { PAGE } from "@/components/page-layout";
import { SearchField } from "@/components/search-field";
import { SortDropdown } from "@/components/sort-dropdown";
import { countText } from "@/lib/format";
import { categoryData } from "@/lib/video-data";
import { filterIn } from "@/lib/search-match";

const SORT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Name (A-Z)", value: "name-asc" },
  { label: "Name (Z-A)", value: "name-desc" },
  { label: "Most videos", value: "videos" },
] as const;
type Sort = (typeof SORT_OPTIONS)[number]["value"];

const LANGUAGES = [...new Set(categoryData.flatMap((c) => c.languages))];

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const languages = useLanguageFilter(LANGUAGES);


  // Categories with videos in the chosen languages
  const categories = filterIn(categoryData.filter((c) => c.languages.some((l) => languages.selected.includes(l))), searchQuery, (c) => [c.name, c.description])
    .sort((a, b) => (sort === "name-asc" ? a.name.localeCompare(b.name) : sort === "name-desc" ? b.name.localeCompare(a.name) : sort === "videos" ? b.videoCount - a.videoCount : 0));

  return (
    <div className="min-h-screen bg-background">
      <div className={PAGE}>
        <ListHeader title="Categories">
          <SearchField value={searchQuery} onChange={setSearchQuery} label="Search categories" className={LIST_SEARCH} />
          <SortDropdown options={SORT_OPTIONS} currentValue={sort} onSelect={setSort} />
        </ListHeader>

        <LanguageChips filter={languages} />
        <h2 className="sr-only">All categories</h2>

        {categories.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No categories found" description="Try another language or different keywords" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {categories.map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className="flex h-full flex-col rounded-xl border p-4 transition-colors active:bg-accent can-hover:hover:bg-muted/50">
                <div className="flex flex-1 items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-medium leading-[22px]">{c.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{c.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3 text-[13px] leading-[18px] text-muted-foreground md:text-sm">
                  <span>{countText(c.videoCount, "video")}</span>
                  <span className="flex gap-1">
                    {c.languages.map((lang) => (
                      <span key={lang} className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium uppercase leading-4">
                        {lang}
                      </span>
                    ))}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
