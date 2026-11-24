import { Page } from '@playwright/test';

// A fake YouTube embed for tests: it speaks the same postMessage protocol as the real player (answers the
// 'listening' handshake, reports player states, takes commands), so autoplay rules, lost commands and the
// end of a video can be tested exactly. Like a browser, it refuses to play with sound until sound is allowed.
// It starts muted when the URL says mute=1 and plays at once with autoplay=1 (muted: always allowed). It reports
// the video it shows (videoData.video_id) and takes loadVideoById, like the real one.
// `ios`: Safari's rule — sound is never allowed for a player started on its own, but an unMute that reaches a
// player already playing (the tap on a video, lib/player-host.ts) gives it sound for good.
// `clock`: time runs while it plays (reported every 250ms), as in a real player; otherwise it only moves on seeks.
// `trouble`: asked for each player that loads (its video's id) — 'stalled': it answers but its stream never starts
// (state 3), 'unavailable': YouTube's error 150, 'silent': it never answers. In the frame, window.__troubles[id] does the
// same for videos loaded later (loadVideoById).
// In the frame: window.__player() → { playing, muted, videoId }, window.__end() ends the video,
// window.__commands lists the commands received (window.__log: with their arguments).

export type Trouble = 'stalled' | 'unavailable' | 'silent';

const fakePlayer = (allowSound: boolean, dropFirstPlay: boolean, ios: boolean, clock: boolean, trouble?: Trouble) => `<!doctype html><html><body><script>
  const params = new URLSearchParams(location.search);
  let muted = params.get('mute') === '1', state = -1, listening = false, dropFirstPlay = ${dropFirstPlay}, time = 0, rate = 1, volume = 100;
  let videoId = location.pathname.split('/').pop();
  const subscribed = new Set();
  window.__allowSound = ${allowSound};
  window.__commands = [];
  window.__log = [];
  const ios = ${ios};
  let trouble = '${trouble ?? ''}';
  window.__troubles = {};
  const send = (m) => parent.postMessage(JSON.stringify(m), '*');
  const info = () => ({ playerState: state, currentTime: time, duration: 30, muted, volume, playbackRate: rate, videoData: { video_id: videoId } });
  const setState = (s, t = time) => { state = s; time = t; send({ event: 'infoDelivery', info: info() }); };
  window.addEventListener('message', (e) => {
    let d; try { d = JSON.parse(e.data); } catch { return; }
    if (trouble === 'silent') return;
    if (d.event === 'listening') {
      if (!listening) {
        listening = true;
        send({ event: 'initialDelivery', info: { playerState: -1, videoData: { video_id: videoId } } });
        send({ event: 'onReady' });
        if (trouble === 'unavailable') send({ event: 'onError', info: 150 });
        if (params.get('autoplay') === '1' && muted) setState(1);
      }
      return;
    }
    if (d.event !== 'command') return;
    window.__commands.push(d.func);
    window.__log.push([d.func, d.args]);
    if (d.func === 'addEventListener') subscribed.add(d.args[0]);
    else if (d.func === 'mute') { muted = true; send({ event: 'infoDelivery', info: info() }); }
    else if (d.func === 'unMute') {
      if (ios && state === 1) window.__allowSound = true;     // unmuted while playing: sound from now on
      if (!ios || window.__allowSound) muted = false;
      send({ event: 'infoDelivery', info: info() });
    }
    else if (d.func === 'loadVideoById') {
      const a = d.args[0];
      videoId = typeof a === 'string' ? a : a.videoId;
      time = 0;
      trouble = window.__troubles[videoId] || '';
      if (trouble === 'unavailable') { setState(-1, 0); send({ event: 'onError', info: 150 }); return; }
      if (trouble === 'stalled') { setState(3, 0); return; }
      // Loading plays the new video (muted ones always; with sound only if allowed)
      if (muted || window.__allowSound) setState(1, 0);
      else { setState(-1, 0); if (subscribed.has('onAutoplayBlocked')) send({ event: 'onAutoplayBlocked' }); }
    }
    else if (d.func === 'seekTo') { time = d.args[0]; send({ event: 'infoDelivery', info: info() }); }
    else if (d.func === 'setPlaybackRate') { rate = d.args[0]; send({ event: 'infoDelivery', info: info() }); }
    else if (d.func === 'setVolume') volume = d.args[0];
    else if (d.func === 'pauseVideo') { if (state === 1 || state === 3) setState(2); }
    else if (d.func === 'playVideo') {
      if (trouble === 'unavailable') return;
      if (trouble === 'stalled') { setState(3); return; }
      if (dropFirstPlay) { dropFirstPlay = false; return; }          // a command the player didn't act on
      if (!muted && !window.__allowSound) {                           // the browser blocks sound
        setState(-1);
        if (subscribed.has('onAutoplayBlocked')) send({ event: 'onAutoplayBlocked' });
        return;
      }
      setState(1, time >= 30 ? 0 : time);
    }
  });
  if (${clock}) setInterval(() => {
    if (state !== 1 || time >= 30) return;
    time = Math.min(30, time + 0.25 * rate);
    send({ event: 'infoDelivery', info: { currentTime: time } });
  }, 250);
  // A start= in the URL (inline previews going on from where a video was left)
  if (params.get('start')) time = Number(params.get('start'));
  window.__player = () => ({ playing: state === 1, muted, videoId, time });
  window.__end = () => setState(0, 30);
</script></body></html>`;

export async function useFakeYouTube(page: Page, options: { allowSound?: () => boolean; dropFirstPlay?: boolean; ios?: boolean; clock?: boolean; trouble?: (videoId: string) => Trouble | undefined } = {}) {
  const allowSound = options.allowSound ?? (() => !options.ios);
  // Shorts use www.youtube.com, the watch pages the privacy-enhanced www.youtube-nocookie.com
  for (const host of ['https://www.youtube.com', 'https://www.youtube-nocookie.com'])
    await page.route(`${host}/embed/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: fakePlayer(allowSound(), !!options.dropFirstPlay, !!options.ios, !!options.clock, options.trouble?.(new URL(route.request().url()).pathname.split('/').pop()!)) }));
}
