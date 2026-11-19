// hooks/useDontRecommend.ts
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFeedPreferences } from "@/hooks/useFeedPreferences";
import { useLanguage } from "@/hooks/use-language";

/** "Don't recommend channel": hides the channel from the home feed, with Undo. Guests are asked to sign in. */
export function useDontRecommend() {
  const { setChannelFeed } = useFeedPreferences();
  const { isGuest } = useLanguage();
  const router = useRouter();

  return (channelId: string, channelName: string) => {
    if (isGuest) {
      toast.error("Please sign in to manage channel feed", {
        action: { label: "Sign in", onClick: () => router.push("/signin") },
      });
      return;
    }
    setChannelFeed(channelId, false);
    toast(`${channelName} won't be recommended`, {
      description: "You can turn it back on from Channels.",
      action: { label: "Undo", onClick: () => setChannelFeed(channelId, true) },
    });
  };
}
