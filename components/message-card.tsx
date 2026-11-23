// components/message-card.tsx
// A message at the bottom of the screen (lib/notify.ts), in the shape of YouTube's: the video's picture along its left
// edge, the text, and a button. Dark on a light page and the other way round (measured on youtube.com).
import Image from "next/image";

export interface MessageThumb {
  src: string;
  /** A short: its 9:16 picture */
  short?: boolean;
}

export function MessageCard({ message, thumb, action }: { message: string; thumb?: MessageThumb; action?: { label: string; onClick: () => void } }) {
  return (
    <div
      className={`flex w-full min-w-64 max-w-full items-center overflow-hidden rounded-lg bg-[#0f0f0f] font-sans text-[#f1f1f1] shadow-lg sm:w-fit dark:bg-[#f1f1f1] dark:text-[#0f0f0f] ${thumb ? "min-h-14" : "min-h-12"}`}
    >
      {thumb && (
        <span className={`relative h-14 flex-shrink-0 self-stretch ${thumb.short ? "w-8" : "w-[100px]"}`}>
          <Image src={thumb.src} alt="" fill sizes="100px" className="object-cover" />
        </span>
      )}
      <span className="mx-3 my-2 line-clamp-2 min-w-0 flex-1 text-sm leading-5 [overflow-wrap:anywhere]">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mr-2 h-9 flex-shrink-0 rounded-full px-3 text-sm font-medium text-[#3ea6ff] transition-colors hover:bg-white/10 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current dark:text-[#065fd4] dark:hover:bg-black/10 dark:active:bg-black/10"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
