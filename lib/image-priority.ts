// lib/image-priority.ts
// Loading hints for above-the-fold images, tuned with Lighthouse (mobile + desktop):
// - The page's main (LCP) image is preloaded at high priority. These lists render on the
//   client, so React's preload starts the download during render, before the <img> exists.
//   A hidden desktop/mobile copy with the same URL shares that single preload.
// - Other visible images (rarely needed) load eagerly; everything else stays lazy.

export type ImagePriority = "lcp" | "visible";

export function imagePriorityProps(
  priority?: ImagePriority,
  { preload = true }: { preload?: boolean } = {}
): { preload?: true; fetchPriority?: "high"; loading?: "eager" } {
  if (priority === "lcp") return preload ? { preload: true, fetchPriority: "high" } : { loading: "eager", fetchPriority: "high" };
  if (priority === "visible") return { loading: "eager" };
  return {};
}

/**
 * Only the first item is loaded early. Lighthouse showed that loading more than one image
 * early slows the main image on mobile: they compete for bandwidth, and pages that render a
 * hidden desktop/mobile copy of a list would download the hidden copy's images too.
 */
export function priorityForIndex(index: number, alsoVisible = 0): ImagePriority | undefined {
  if (index === 0) return "lcp";
  return index <= alsoVisible ? "visible" : undefined;
}
