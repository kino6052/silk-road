// View bootstrap: untested by design (see CLAUDE.md). Keep logic out of this file.
import './view/style.css';
import { createApp } from './view/app';
import type { Inbound } from './worker/bootstrap';
import type { Reply } from './worker/core';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app missing');

const worker = new Worker(new URL('./worker/bootstrap.ts', import.meta.url), { type: 'module' });
const send = (message: Inbound) => {
  worker.postMessage(message);
};
const app = createApp(root, send);
worker.addEventListener('message', (event: MessageEvent<Reply>) => {
  app.onReply(event.data);
});
worker.addEventListener('error', (event) => {
  console.error('worker error', event.message);
});

// A shareable seed: ?seed=1234.
const seed = new URLSearchParams(location.search).get('seed');
send(seed === null ? { type: 'init' } : { type: 'init', seed: Number(seed) });
