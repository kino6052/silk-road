// Page layout: top bar, map and side panels. Renders frames and forwards input. No game logic.
import type { Tab } from '../app/state';
import type { Speed } from '../sim/engine/clock';
import type { Overlay } from '../vm/map';
import type { Frame, Reply } from '../worker/core';
import { button, clock, delegate, formatDate, h, t, type Send } from './dom';
import { createMap } from './map';
import { createCountry, createPerson, createStories } from './panels';

const SPEEDS: readonly Speed[] = ['paused', 'micro', 'week', 'month', 'year'];
const OVERLAYS: readonly Overlay[] = [
  'none',
  'income',
  'pollution',
  'unemployment',
  'china',
  'wellbeing',
  'debt',
];
const TABS: readonly Tab[] = ['country', 'feed', 'person'];

/** Marks the button whose `data-value` equals `value` as pressed. */
function mark(group: HTMLElement, value: string): void {
  for (const el of group.querySelectorAll<HTMLElement>('[data-value]'))
    el.setAttribute('aria-pressed', String(el.dataset.value === value));
}

function group(...buttons: HTMLElement[]): HTMLElement {
  return h('div', { className: 'group', role: 'group' }, ...buttons);
}

export function createApp(root: HTMLElement, send: Send): { onReply(reply: Reply): void } {
  const date = h('span', { className: 'date' }, '…');
  const speeds = group(
    ...SPEEDS.map((speed) =>
      button(t(`speed.${speed}`), { type: 'speed', speed }, { 'data-value': speed }),
    ),
  );
  const overlay = h(
    'select',
    {},
    ...OVERLAYS.map((o) => h('option', { value: o }, t(`overlay.${o}`))),
  ) as HTMLSelectElement;
  overlay.addEventListener('change', () => {
    send({ type: 'overlay', overlay: overlay.value as Overlay });
  });
  const worlds = group(
    button(t('world.bri'), { type: 'world', world: 'bri' }, { 'data-value': 'bri' }),
    button(t('world.shadow'), { type: 'world', world: 'shadow' }, { 'data-value': 'shadow' }),
  );
  const modes = group(
    button(t('mode.micro'), { type: 'mode', mode: 'micro' }, { 'data-value': 'micro' }),
    button(t('mode.macro'), { type: 'mode', mode: 'macro' }, { 'data-value': 'macro' }),
  );
  const tabs = group(
    ...TABS.map((tab) => button(t(`tab.${tab}`), { type: 'tab', tab }, { 'data-value': tab })),
  );
  const status = h('span', { className: 'status', role: 'status' });

  const map = createMap(send);
  const country = createCountry(send);
  const stories = createStories();
  const person = createPerson();
  const side = h(
    'aside',
    { className: 'side' },
    tabs,
    h('div', { className: 'panels' }, country.el, stories.el, person.el),
  );

  root.replaceChildren(
    h(
      'header',
      { className: 'topbar' },
      h('h1', {}, t('ui.title')),
      date,
      speeds,
      overlay,
      worlds,
      modes,
      status,
    ),
    h('main', { className: 'main' }, h('section', { className: 'map-pane' }, map.el), side),
  );
  delegate(root, send);

  const render = (frame: Frame) => {
    const { state } = frame;
    root.dataset.mode = state.mode;
    root.dataset.tab = state.tab;
    root.dataset.world = state.world;
    date.textContent = t('ui.date', { date: `${formatDate(frame.date)} · ${clock(frame.hour)}` });
    mark(speeds, state.speed);
    mark(worlds, state.world);
    mark(modes, state.mode);
    mark(tabs, state.tab);
    if (overlay.value !== state.overlay) overlay.value = state.overlay;
    map.render(frame);
    country.render(frame);
    stories.render(frame);
    person.render(frame);
  };

  return {
    onReply: (reply) => {
      switch (reply.type) {
        case 'frame':
          render(reply.frame);
          return;
        case 'saved':
          return;
        case 'error':
          status.textContent = t(reply.message);
      }
    },
  };
}
