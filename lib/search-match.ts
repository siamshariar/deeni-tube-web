import { transliterateBangla } from "./slug";

/**
 * Finding what was typed or said. People speak in phrases ("zakir naik video"), and voice search writes
 * names as it hears them ("manjur" for "Monzur"), so a search is more than the exact phrase:
 * the phrase first, then every word in any place, then words that sound the same.
 */

// Words that say nothing about what to look for; left out when the search has others
const FILLER = new Set(
  "a an the of on in by for and or to with from about is are me my i want show play find search watch please video videos ভিডিও ভিডিওটি ভিডিওগুলো দেখাও দেখান দাও চাই খুঁজুন".normalize("NFC").split(" ")
);

const plain = (text: string) => text.normalize("NFC").toLowerCase();
const wordsOf = (text: string) => plain(text).split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);

function queryWords(query: string): string[] {
  const words = [...new Set(wordsOf(query))];
  const telling = words.filter((w) => !FILLER.has(w));
  return telling.length ? telling : words;
}

/** A word as it sounds: Latin letters, spellings of one sound made the same, of its vowels only that it starts or ends with one */
function soundKey(word: string): string {
  const latin = transliterateBangla(word)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/kh|ck|q/g, "k")
    .replace(/sh|th/g, "s")
    .replace(/gh/g, "g")
    .replace(/dh/g, "d")
    .replace(/bh|v/g, "b")
    .replace(/ph/g, "f")
    .replace(/jh|z/g, "j");
  const consonants = latin.replace(/[aeiouyw]/g, "").replace(/(.)\1+/g, "$1");
  // Too little left to tell words apart
  if (latin.length < 4 || consonants.length < 2) return "";
  // "surah" ends as "sura" does; "Zakir" must not be "Zakaria"
  const end = /[aeiouy]h?$/.test(latin) ? "a" : "";
  return (/^[aeiou]/.test(latin) ? "a" : "") + (end ? consonants.replace(/h$/, "") : consonants) + end;
}

type Texts = { main: string[]; more?: string };

/** How a text has the words of a search: 3 the phrase, 2 every word, 1 every word by its sound, 0 not all of them */
function compare(words: string[], phrase: string, { main, more = "" }: Texts) {
  const text = plain([...main, more].join("\n"));
  const written = words.map((w) => text.includes(w));
  const asWritten = written.filter(Boolean).length;
  if (text.includes(phrase)) return { level: 3, found: words.length, asWritten };
  if (written.every(Boolean)) return { level: 2, found: words.length, asWritten };
  const sounds = new Set(main.flatMap(wordsOf).map(soundKey));
  const heard = words.map((w, i) => written[i] || (!!soundKey(w) && sounds.has(soundKey(w))));
  return { level: heard.every(Boolean) ? 1 : 0, found: heard.filter(Boolean).length, asWritten };
}

/** The items found, the best first; the order they came in is kept within each kind */
export function searchIn<T>(items: T[], query: string, textsOf: (item: T) => Texts): T[] {
  const phrase = plain(query.trim());
  const words = queryWords(query);
  if (!phrase) return items;
  if (!words.length) return items.filter((item) => compare([], phrase, textsOf(item)).level === 3);
  const all = items.map((item) => ({ item, ...compare(words, phrase, textsOf(item)) }));
  for (const level of [2, 1]) {
    const hits = all.filter((a) => a.level >= level);
    if (hits.length) return hits.sort((a, b) => b.level - a.level).map((a) => a.item);
  }
  // Not everything anywhere: what has the most of it
  const most = Math.max(0, ...all.map((a) => a.found));
  return most ? all.filter((a) => a.found === most).sort((a, b) => b.asWritten - a.asWritten).map((a) => a.item) : [];
}

/** For the lists' own search boxes: the same, in the list's order */
export function filterIn<T>(items: T[], query: string, textsOf: (item: T) => (string | undefined)[]): T[] {
  const found = new Set(searchIn(items, query, (item) => ({ main: textsOf(item).filter((t): t is string => !!t) })));
  return items.filter((item) => found.has(item));
}
