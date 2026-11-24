// lib/time-ago.ts
// "2 weeks ago" texts from the catalogue: their short form, as YouTube writes it in its related list ("2w ago"), and
// their age in days, for sorting.

const UNITS: Record<string, { days: number; short: string }> = {
  second: { days: 1 / 86_400, short: "s" },
  minute: { days: 1 / 1_440, short: "m" },
  hour: { days: 1 / 24, short: "h" },
  day: { days: 1, short: "d" },
  week: { days: 7, short: "w" },
  month: { days: 30, short: "mo" },
  year: { days: 365, short: "y" },
};

const parse = (text: string) => /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i.exec(text.trim());

export function shortAgo(text: string): string {
  const m = parse(text);
  return m ? `${m[1]}${UNITS[m[2].toLowerCase()].short} ago` : text;
}

export function daysAgo(text: string): number {
  const m = parse(text);
  return m ? Number(m[1]) * UNITS[m[2].toLowerCase()].days : Infinity;
}
