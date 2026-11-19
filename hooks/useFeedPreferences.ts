// hooks/useFeedPreferences.ts
// Which channels appear in the home feed. Shared by the home feed, /channels,
// video cards and the channel/scholar pages ("Don't recommend channel").
"use client";

import { useCallback } from "react";
import { createLocalStore, useLocalStore } from "@/lib/local-store";
import { channelData } from "@/lib/channel-data";
import { videoData } from "@/lib/video-data";

const ALL_CHANNEL_IDS = Array.from(new Set([...channelData.map((c) => c.id), ...videoData.map((v) => v.channelId)]));

const feedStore = createLocalStore<string[]>("feed-visible-channels", () => ALL_CHANNEL_IDS);

export const useFeedPreferences = () => {
  const followedChannels = useLocalStore(feedStore, ALL_CHANNEL_IDS);

  const setChannelFeed = useCallback((channelId: string, on: boolean) => {
    feedStore.set((prev) => {
      const isOn = prev.includes(channelId);
      if (on === isOn) return prev;
      return on ? [...prev, channelId] : prev.filter((id) => id !== channelId);
    });
  }, []);

  const toggleFollowChannel = useCallback((channelId: string) => {
    feedStore.set((prev) => (prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]));
  }, []);

  const isFollowed = useCallback((channelId: string) => followedChannels.includes(channelId), [followedChannels]);

  return { followedChannels, toggleFollowChannel, setChannelFeed, isFollowed };
};
