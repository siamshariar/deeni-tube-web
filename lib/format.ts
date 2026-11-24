// lib/format.ts
// Numbers as YouTube writes them: 4.6K, 15K, 780K, 1.25M. Cut, not rounded up.

/** `digits`: how many figures to keep at most (YouTube: 2 for views, 3 for subscribers). */
export function compactNumber(n: number, digits = 2): string {
  for (const [unit, size] of [["B", 1e9], ["M", 1e6], ["K", 1e3]] as const) {
    if (n < size) continue;
    const value = n / size;
    const decimals = Math.max(0, digits - String(Math.floor(value)).length);
    return `${Number((Math.floor(value * 10 ** decimals) / 10 ** decimals).toFixed(decimals))}${unit}`;
  }
  return String(n);
}

/** "15,234", "15K" or "15K views" → "15K views" */
export function viewsText(views: string): string {
  if (/views?$/.test(views)) return views;
  const plain = /^[\d,]+$/.test(views) ? Number(views.replace(/,/g, "")) : null;
  return `${plain === null ? views : compactNumber(plain)} views`;
}

export const countText = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
