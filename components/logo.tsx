// components/logo.tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Rendered height in px; width follows the image's aspect ratio */
  height: number;
  className?: string;
}

// Header-sized WebP copies of DeeniTubeLogo.png (84px tall = 3x the largest use, ~12 KB instead of 28 KB).
// Keeping width/height in this ratio stops next/image warning that only one dimension was changed by CSS.
const LOGO_WIDTH = 465;
const LOGO_HEIGHT = 84;

/** Deeni.tube wordmark; swaps to a light-text version in dark mode. */
export default function Logo({ height, className }: LogoProps) {
  const width = Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT);
  return (
    <>
      {/* Above the fold, so load eagerly; it's small, so no preload or high priority needed */}
      <Image src="/logo-header.webp" alt="Deeni.tube" width={width} height={height} className={cn(className, "dark:hidden")} loading="eager" />
      {/* Hidden in light mode: stay lazy so light-mode visitors never download it */}
      <Image src="/logo-header-dark.webp" alt="Deeni.tube" width={width} height={height} className={cn(className, "hidden dark:block")} />
    </>
  );
}
