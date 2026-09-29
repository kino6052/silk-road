// The macro map: terrain drawn once, overlay tint, freight links and people. No game logic.
import mapJson from '../content/generated/map.json';
import { CONTENT } from '../content';
import type { Mode } from '../content/types';
import { decodeMap, regionGrid, terrain } from '../gen/map';
import { PALETTE, type Rgb } from '../gen/palette';
import type { RoleGroup } from '../sim/people/types';
import type { Overlay } from '../vm/map';
import type { Frame } from '../worker/core';
import { h, t, type Send } from './dom';
import { blit, canvas, rgb } from './pixels';

const SCALE = 2;
/** How close (in map cells) a click must be to a person to pick them. */
const PICK_RADIUS = 1.5;

const MODE_COLOUR: Readonly<Record<Mode, Rgb>> = {
  rail: [214, 120, 78],
  road: [222, 196, 120],
  sea: [120, 176, 214],
  pipeline: [176, 128, 206],
};

export const GROUP_COLOUR: Readonly<Record<RoleGroup, Rgb>> = {
  transport: [110, 170, 236],
  locals: [236, 216, 150],
  builders: [240, 140, 60],
  officials: [222, 120, 214],
};

/** Overlay tint strength; 'none' draws nothing. */
const OVERLAY_ALPHA: Readonly<Record<Overlay, number>> = {
  none: 0,
  income: 0.6,
  pollution: 0.6,
  unemployment: 0.6,
  china: 0.6,
  wellbeing: 0.6,
  debt: 0.6,
};

const RAMP: readonly Rgb[] = [
  [44, 62, 120],
  [70, 150, 146],
  [240, 214, 110],
];

/** Low → high colour for a 0–1 overlay value. */
function ramp(value: number): Rgb {
  const scaled = Math.min(1, Math.max(0, value)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const [a, b] = [RAMP[i] ?? [0, 0, 0], RAMP[i + 1] ?? [0, 0, 0]];
  return [0, 1, 2].map((c) => Math.round((a[c] ?? 0) + ((b[c] ?? 0) - (a[c] ?? 0)) * f)) as [
    number,
    number,
    number,
  ];
}

function legend(): HTMLElement {
  const swatch = (colour: Rgb, label: string, className = 'swatch') =>
    h(
      'span',
      { className: 'legend-item' },
      h('i', { className, style: `background:${rgb(colour)}` }),
      label,
    );
  const gradient = `background:linear-gradient(90deg,${RAMP.map((c) => rgb(c)).join(',')})`;
  return h(
    'div',
    { className: 'legend' },
    h('span', {}, `${t('ui.legend')}:`),
    h(
      'span',
      { className: 'legend-item' },
      '−',
      h('i', { className: 'gradient', style: gradient }),
      '+',
    ),
    ...(Object.keys(MODE_COLOUR) as Mode[]).map((mode) =>
      swatch(MODE_COLOUR[mode], t(`mode.${mode}`), 'line'),
    ),
    ...(Object.keys(GROUP_COLOUR) as RoleGroup[]).map((group) =>
      swatch(GROUP_COLOUR[group], t(`group.${group}`), 'dot'),
    ),
  );
}

export function createMap(send: Send): { el: HTMLElement; render(frame: Frame): void } {
  const grid = decodeMap(mapJson);
  const regions = regionGrid(grid, CONTENT);
  const corridor = new Set(CONTENT.countries.filter((c) => c.role === 'corridor').map((c) => c.id));
  const { width, height } = grid;

  const base = canvas(width, height);
  const image = base.ctx.createImageData(width, height);
  blit(image, { width, height, pixels: terrain(grid, regions, CONTENT) }, PALETTE);
  base.ctx.putImageData(image, 0, 0);

  const tint = canvas(width, height);
  let tintKey = '';
  const drawTint = (overlay: Overlay, values: readonly number[]) => {
    const key = `${overlay}:${values.join(',')}`;
    if (key === tintKey) return;
    tintKey = key;
    const layer = tint.ctx.createImageData(width, height);
    const alpha = Math.round(OVERLAY_ALPHA[overlay] * 255);
    const colours = values.map(ramp);
    for (let i = 0; i < regions.length; i++) {
      const colour = colours[regions[i] ?? -1];
      if (!colour) continue;
      layer.data.set([colour[0], colour[1], colour[2], alpha], i * 4);
    }
    tint.ctx.putImageData(layer, 0, 0);
  };

  const view = canvas(width * SCALE, height * SCALE);
  view.el.className = 'map-canvas';
  const caption = h('div', { className: 'map-caption' }, ' ');
  let last: Frame | null = null;

  const cellAt = (event: MouseEvent) => {
    const box = view.el.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * width,
      y: ((event.clientY - box.top) / box.height) * height,
      /** Map cells per screen pixel: the map shrinks on phones, so taps need more reach. */
      perPixel: width / box.width,
    };
  };
  const countryAt = (x: number, y: number) =>
    grid.codes[grid.cells[Math.floor(y) * width + Math.floor(x)] ?? 0] ?? '';

  view.el.addEventListener('pointerdown', (event) => {
    const { x, y, perPixel } = cellAt(event);
    describe(event);
    // Reach at least PICK_RADIUS cells, or ~16 screen pixels for fingers on small screens.
    const reach = Math.max(PICK_RADIUS, (event.pointerType === 'touch' ? 16 : 8) * perPixel);
    let best: { id: number; d: number } | null = null;
    for (const dot of last?.map.people ?? []) {
      const d = Math.hypot(dot.x - x, dot.y - y);
      if (d <= reach && (!best || d < best.d)) best = { id: dot.id, d };
    }
    if (best) {
      send({ type: 'person', person: best.id });
      return;
    }
    const country = countryAt(x, y);
    if (corridor.has(country)) send({ type: 'country', country });
  });

  /** Names the place under the pointer (on tap too, since phones have no hover). */
  function describe(event: MouseEvent): void {
    const { x, y } = cellAt(event);
    const region = CONTENT.regions[regions[Math.floor(y) * width + Math.floor(x)] ?? -1];
    const country = countryAt(x, y);
    caption.textContent = region
      ? `${t(`region.${region.id}`)} · ${t(`country.${region.country}`)}`
      : corridor.has(country)
        ? t(`country.${country}`)
        : ' ';
  }
  view.el.addEventListener('pointermove', describe);

  const render = (frame: Frame) => {
    last = frame;
    const { ctx } = view;
    drawTint(frame.state.overlay, frame.map.overlay);
    ctx.drawImage(base.el, 0, 0, width * SCALE, height * SCALE);
    ctx.drawImage(tint.el, 0, 0, width * SCALE, height * SCALE);

    ctx.lineCap = 'round';
    for (const link of frame.map.links) {
      ctx.strokeStyle = rgb(MODE_COLOUR[link.mode], 0.35 + 0.65 * link.load);
      ctx.lineWidth = 1 + link.load * 4;
      ctx.setLineDash(link.open ? [] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(link.x1 * SCALE, link.y1 * SCALE);
      ctx.lineTo(link.x2 * SCALE, link.y2 * SCALE);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const dot of frame.map.people) {
      ctx.fillStyle = rgb(GROUP_COLOUR[dot.group]);
      ctx.fillRect(Math.round(dot.x * SCALE) - 1, Math.round(dot.y * SCALE) - 1, 2, 2);
    }
    const selected = frame.map.people.find((dot) => dot.id === frame.state.person);
    if (selected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.round(selected.x * SCALE) - 4.5,
        Math.round(selected.y * SCALE) - 4.5,
        8,
        8,
      );
    }
  };

  return { el: h('div', { className: 'map' }, view.el, caption, legend()), render };
}
