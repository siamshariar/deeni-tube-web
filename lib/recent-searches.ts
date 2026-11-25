// lib/recent-searches.ts
// What was searched before, newest first ('recentSearches'): the header's search box and the phones' search screen.
const KEY = "recentSearches";

export function loadRecentSearches(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}
export function saveRecentSearches(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}
