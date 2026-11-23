// hooks/useDontRecommend.ts
"use client";

import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { useFeedPreferences } from "@/hooks/useFeedPreferences";
import { useLanguage } from "@/hooks/use-language";

/** "Don't recommend channel": hides the channel from the home feed, with Undo. Guests are asked to sign in. */
export function useDontRecommend() {
  const { setChannelFeed } = useFeedPreferences();
  const { isGuest } = useLanguage();
  const router = useRouter();

  return (channelId: string, channelName: string) => {
    if (isGuest) {
      notify("Sign in to choose your Home feed's channels", { action: { label: "Sign in", onClick: () => router.push("/signin") } });
      return;
    }
    setChannelFeed(channelId, false);
    notify(`${channelName} won't be recommended`, () => setChannelFeed(channelId, true));
  };
}
