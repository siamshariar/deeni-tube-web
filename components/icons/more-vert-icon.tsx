// components/icons/more-vert-icon.tsx
// Three-dot ("kebab") menu icon with solid dots. Standard size (see MoreButton): 20px on phones,
// 24px from md up (`h-5 w-5 md:h-6 md:w-6`). lucide's MoreVertical draws hairline dots that
// look too small at the same size.
import type { SVGProps } from "react";

export function MoreVertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" data-icon="more-vert" {...props}>
      <circle cx="12" cy="5" r="2.05" />
      <circle cx="12" cy="12" r="2.05" />
      <circle cx="12" cy="19" r="2.05" />
    </svg>
  );
}
