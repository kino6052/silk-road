// Tiny DOM helpers for the debug view. No game logic.
import { en } from '../i18n/en';
import { createTranslator } from '../i18n/t';
import type { Inbound } from '../worker/bootstrap';

export const t = createTranslator(en);

export type Send = (message: Inbound) => void;

type Child = Node | string | null;
type Attrs = Readonly<Record<string, string | number | boolean | undefined>>;

/** Creates an element; `msg` becomes a JSON message the delegated handler sends on press. */
export function h(tag: string, attrs: Attrs = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (name === 'msg') el.dataset.msg = String(value);
    else if (name === 'style') el.setAttribute('style', String(value));
    else
      el.setAttribute(name === 'className' ? 'class' : name, value === true ? '' : String(value));
  }
  for (const child of children) if (child !== null) el.append(child);
  return el;
}

/** A button that sends `message` when pressed. */
export function button(label: string, message: Inbound, attrs: Attrs = {}): HTMLElement {
  return h('button', { type: 'button', ...attrs, msg: JSON.stringify(message) }, label);
}

/** Rebuilds `el` only when `key` changed, so stable content keeps focus and hover. */
export function patch(el: HTMLElement, key: string, build: () => Child[]): void {
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  el.replaceChildren(...build().filter((child): child is Node | string => child !== null));
}

/** A horizontal 0–1 bar. */
export function bar(value: number, className: string): HTMLElement {
  const width = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return h('span', { className: `bar ${className}` }, h('i', { style: `width:${String(width)}%` }));
}

/**
 * Sends the JSON message on any `[data-msg]` element: on pointerdown for mouse and touch
 * (so content redrawn between press and release still reacts) and on keyboard clicks.
 */
export function delegate(root: HTMLElement, send: Send): void {
  const fire = (event: Event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-msg]');
    const msg = target?.dataset.msg;
    if (msg === undefined) return;
    event.preventDefault();
    send(JSON.parse(msg) as Inbound);
  };
  root.addEventListener('pointerdown', (event) => {
    if (event.button === 0) fire(event);
  });
  root.addEventListener('click', (event) => {
    if (event.detail === 0) fire(event);
  });
}

const MONTH = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' });

/** "2 Sep 2013". */
export function formatDate(date: { year: number; month: number; day: number }): string {
  const month = MONTH.format(Date.UTC(date.year, date.month - 1, date.day));
  return `${String(date.day)} ${month} ${String(date.year)}`;
}

/** "07:00" for an hour of the week. */
export const clock = (hourOfWeek: number): string =>
  `${String(hourOfWeek % 24).padStart(2, '0')}:00`;

/** A region or country name for an id, or the id itself when it names neither. */
export function place(id: string): string {
  if (en[`region.${id}`] !== undefined) return t(`region.${id}`);
  if (en[`country.${id}`] !== undefined) return t(`country.${id}`);
  return id;
}
