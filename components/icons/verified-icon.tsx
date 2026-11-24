// components/icons/verified-icon.tsx
import { cn } from "@/lib/utils";

/** A verified channel's tick. */
export function VerifiedIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Verified" className={cn("inline-block flex-shrink-0 text-muted-foreground", className)}>
      <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm5.707 7.293a1 1 0 010 1.414L10 17.414l-3.707-3.707a1 1 0 111.414-1.414L10 14.586l6.293-6.293a1 1 0 011.414 0Z" />
    </svg>
  );
}

/** A name and, if verified, its tick: kept with the last word, so it's never alone on a line. */
export function VerifiedName({ name, verified, className }: { name: string; verified?: boolean; className?: string }) {
  if (!verified) return <>{name}</>;
  const last = name.lastIndexOf(" ") + 1;
  return (
    <>
      {name.slice(0, last)}
      <span className="whitespace-nowrap">
        {name.slice(last)}
        <VerifiedIcon className={className} />
      </span>
    </>
  );
}
