// lib/search-languages.ts
// Language filter shared by the /search page and the mobile search modal.

export const SEARCH_LANGUAGES = [
  { code: "bn", name: "Bangla" },
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "ur", name: "Urdu" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
];

const ALL_CODES = SEARCH_LANGUAGES.map((l) => l.code);

/** The user's preferred languages (from the language prompt), or every language if none were chosen. */
export function getDefaultSearchLangs(): string[] {
  if (typeof window === "undefined") return ALL_CODES;
  try {
    const prefs = JSON.parse(localStorage.getItem("deeni-lang-prefs") || "null");
    const langs = Array.isArray(prefs?.languages)
      ? (prefs.languages as string[]).filter((c) => ALL_CODES.includes(c))
      : [];
    return langs.length > 0 ? langs : ALL_CODES;
  } catch {
    return ALL_CODES;
  }
}

export function isDefaultSearchLangs(langs: string[]): boolean {
  const defaults = getDefaultSearchLangs();
  return langs.length === defaults.length && defaults.every((c) => langs.includes(c));
}

/** Parse the `lang` URL param, falling back to the defaults. */
export function parseSearchLangs(param: string | null | undefined): string[] {
  const langs = (param ?? "").split(",").filter((c) => ALL_CODES.includes(c));
  return langs.length > 0 ? langs : getDefaultSearchLangs();
}
