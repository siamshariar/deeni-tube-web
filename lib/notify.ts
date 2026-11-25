// lib/notify.ts
// The short message at the bottom of the screen, as on YouTube: one line, one at a time, gone by itself.
//
// When to show one (Material's guidelines: "Not all actions warrant a confirmation or an acknowledgment"):
// - the result is somewhere else: saved to Watch later or a playlist, a link copied, a report sent
// - something was removed or hidden: with Undo
// - it didn't work, and the page can't say why right there
// When not to: the page itself already shows the result (a switch, a tick, the theme, a comment that appears, a
// renamed or new playlist, a filled Like button, a thank-you screen). Form mistakes are shown at the field, or the
// button stays disabled. Wording: sentence case, no "!", no second line.
import { createElement } from "react";
import { toast } from "sonner";
import { MessageCard, type MessageThumb } from "@/components/message-card";

const SHORT_MS = 3500;
const WITH_ACTION_MS = 6000;

interface MessageOptions {
  /** Adds Undo */
  undo?: () => void;
  action?: { label: string; onClick: () => void };
  /** The picture of the video it's about (mediaThumb) */
  thumb?: MessageThumb;
}

let shown: string | number | undefined;

/** Show a message. A function instead of options is its Undo. */
export function notify(message: string, options: (() => void) | MessageOptions = {}) {
  const { undo, action, thumb } = typeof options === "function" ? ({ undo: options } as MessageOptions) : options;
  const button = undo ? { label: "Undo", onClick: undo } : action;
  if (shown !== undefined) toast.dismiss(shown);
  shown = toast.custom(
    (id) =>
      createElement(MessageCard, {
        message,
        thumb,
        action: button && {
          label: button.label,
          onClick: () => {
            toast.dismiss(id);
            button.onClick();
          },
        },
      }),
    { duration: button ? WITH_ACTION_MS : SHORT_MS }
  );
}
