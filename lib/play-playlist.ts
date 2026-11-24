// lib/play-playlist.ts
// A tap on a playlist card: start the playlist's first video in the shared player inside the tap, so it plays
// with sound on iPhone, iPad and Safari (lib/player-host.ts; does nothing elsewhere). The playlist page then
// takes that player over.
import { findPlayable } from "@/lib/media-lookup";
import { playFromTap } from "@/lib/player-host";

export function playPlaylistFromTap(videoIds: string[] | undefined) {
  const first = videoIds?.length ? findPlayable(videoIds[0])?.videoId : undefined;
  if (first) playFromTap(first);
}
