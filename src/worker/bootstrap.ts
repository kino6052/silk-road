// Worker entry: wires the tested core to real timers and postMessage. No game logic here.
import mapJson from '../content/generated/map.json';
import { CONTENT } from '../content';
import { decodeMap } from '../gen/map';
import { createCore, type Core, type Message, type Reply } from './core';

/** Messages the page may send: core messages plus a one-off init with the seed. */
export type Inbound = Message | { readonly type: 'init'; readonly seed?: number };

const DEFAULT_SEED = 2013;
const TICK_MS = 50;
/** At most ~8 frames per second reach the page; the latest one wins. */
const FRAME_MS = 125;

let core: Core | null = null;
let lastTick = performance.now();
let lastPost = 0;

const post = (reply: Reply) => {
  self.postMessage(reply);
};

const start = (seed: number): Core => {
  const created = createCore(CONTENT, decodeMap(mapJson), seed);
  core = created;
  lastTick = performance.now();
  return created;
};

const handle = (message: Message): Reply => {
  const active = core ?? start(DEFAULT_SEED);
  try {
    return active.handle(message);
  } catch (error) {
    console.error(error);
    return { type: 'error', message: 'worker.failed' };
  }
};

const postNow = (reply: Reply) => {
  post(reply);
  lastPost = performance.now();
};

self.addEventListener('message', (event: MessageEvent<Inbound>) => {
  const message = event.data;
  if (message.type === 'init') {
    start(message.seed ?? DEFAULT_SEED);
    postNow(handle({ type: 'tick', elapsedMs: 0 }));
    return;
  }
  // Replies to the player's own actions go out at once; ticks are throttled below.
  postNow(handle(message));
});

setInterval(() => {
  const now = performance.now();
  const elapsedMs = now - lastTick;
  lastTick = now;
  if (!core) return;
  const reply = handle({ type: 'tick', elapsedMs });
  if (reply.type !== 'frame') {
    post(reply);
    return;
  }
  // Frames in between are dropped: each one carries the whole view state.
  if (now - lastPost >= FRAME_MS) postNow(reply);
}, TICK_MS);
