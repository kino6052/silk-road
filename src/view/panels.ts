// Side panels: country, stories and the person's mind. They only render VM data. No game logic.
import { weekToDate } from '../core/calendar';
import { CONTENT } from '../content';
import { SCENE_PALETTE, SPRITE_PALETTE } from '../gen/palette';
import type { FeedItem, MindVm, Row } from '../vm/panels';
import type { Frame } from '../worker/core';
import { bar, button, clock, formatDate, h, patch, place, t, type Send } from './dom';
import { blit, canvas } from './pixels';

interface Panel {
  readonly el: HTMLElement;
  render(frame: Frame): void;
}

const FORMAT: Readonly<Record<Row['unit'], (value: number) => string>> = {
  bn: (v) => `$${v.toFixed(1)} bn`,
  intl$: (v) => `$${Math.round(v).toLocaleString('en')}`,
  share: (v) => `${(v * 100).toFixed(1)}%`,
  index: (v) => v.toFixed(2),
};

const pct = (value: number) => String(Math.round(value * 100));
const weekDate = (week: number) => formatDate(weekToDate(week));

/** Feed params carry ids; show place names instead. */
const storyText = (item: FeedItem) =>
  t(item.key, { ...item.params, region: place(String(item.params.region)) });

export function createCountry(send: Send): Panel {
  const corridor = CONTENT.countries.filter((c) => c.role === 'corridor');
  const select = h(
    'select',
    { 'aria-label': t('ui.country') },
    ...corridor.map((c) => h('option', { value: c.id }, t(`country.${c.id}`))),
  ) as HTMLSelectElement;
  select.addEventListener('change', () => {
    send({ type: 'country', country: select.value });
  });
  const table = h('div');
  const render = (frame: Frame) => {
    const vm = frame.country;
    if (select.value !== vm.id) select.value = vm.id;
    patch(table, JSON.stringify(vm), () => [
      h(
        'table',
        { className: 'rows' },
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', {}, ''),
            h('th', { className: 'num bri' }, t('ui.bri')),
            h('th', { className: 'num shadow' }, t('ui.shadow')),
            h('th', {}, ''),
          ),
        ),
        h(
          'tbody',
          {},
          ...vm.rows.map((row) => {
            const scale = Math.max(Math.abs(row.bri), Math.abs(row.shadow)) || 1;
            return h(
              'tr',
              {},
              h('td', {}, t(row.key)),
              h('td', { className: 'num' }, FORMAT[row.unit](row.bri)),
              h('td', { className: 'num' }, FORMAT[row.unit](row.shadow)),
              h(
                'td',
                { className: 'pair' },
                bar(Math.abs(row.bri) / scale, 'bri'),
                bar(Math.abs(row.shadow) / scale, 'shadow'),
              ),
            );
          }),
        ),
      ),
    ]);
  };
  return {
    el: h('section', { className: 'panel country' }, h('h2', {}, select), table),
    render,
  };
}

export function createStories(): Panel {
  const list = h('ol', { className: 'feed' });
  const render = (frame: Frame) => {
    patch(list, JSON.stringify(frame.feed), () =>
      frame.feed.map((item) =>
        h(
          'li',
          {
            className: `tone-${item.tone}`,
            msg: JSON.stringify({ type: 'person', person: item.person }),
            tabindex: 0,
          },
          h('span', { className: 'when' }, weekDate(item.week)),
          storyText(item),
        ),
      ),
    );
  };
  return {
    el: h('section', { className: 'panel stories' }, h('h2', {}, t('ui.feed')), list),
    render,
  };
}

const SPRITE_X = 52;
const SPRITE_FOOT = 79;

function drawScene(ctx: CanvasRenderingContext2D, mind: MindVm): void {
  const { scene, sprite } = mind;
  const image = ctx.createImageData(scene.width, scene.height);
  blit(image, scene, SCENE_PALETTE);
  blit(image, sprite, SPRITE_PALETTE, SPRITE_X, SPRITE_FOOT - sprite.height, true);
  ctx.putImageData(image, 0, 0);
}

function beliefRow(belief: MindVm['beliefs'][number]): HTMLElement {
  const [low, high] = [
    Math.min(belief.believed, belief.truth),
    Math.max(belief.believed, belief.truth),
  ];
  const scope = belief.topic.slice(belief.kind.length + 1);
  return h(
    'tr',
    {},
    h(
      'td',
      { title: t(`topic.${belief.kind}.label`) },
      t(`topic.${belief.kind}.question`),
      h('small', {}, ` ${place(scope)}`),
    ),
    h(
      'td',
      { className: 'gap' },
      h(
        'span',
        { className: 'track' },
        h('i', { className: 'span', style: `left:${pct(low)}%;width:${pct(high - low)}%` }),
        h('i', {
          className: 'truth',
          style: `left:${pct(belief.truth)}%`,
          title: t('ui.truth'),
        }),
        h('i', {
          className: 'believed',
          style: `left:${pct(belief.believed)}%;opacity:${String(0.4 + 0.6 * belief.confidence)}`,
          title: t('ui.believes'),
        }),
      ),
    ),
    h('td', { className: 'num' }, pct(belief.believed), ' / ', pct(belief.truth)),
    h('td', {}, t(`source.${belief.source}`)),
  );
}

export function createPerson(): Panel {
  const scene = canvas(160, 90);
  scene.el.className = 'scene';
  const head = h('div', { className: 'who' });
  const now = h('p', { className: 'now' });
  const thoughts = h('ul', { className: 'thoughts' });
  const wellbeing = h('div');
  const beliefs = h('div');
  const decision = h('div', { className: 'decision' });
  const household = h('div', { className: 'household' });
  const recent = h('ol', { className: 'recent' });

  const render = (frame: Frame) => {
    const mind = frame.mind;
    drawScene(scene.ctx, mind);
    patch(
      head,
      JSON.stringify([mind.id, mind.name, mind.age, mind.role, mind.region, mind.alive]),
      () => [
        h('h2', {}, mind.name, mind.alive ? null : h('span', { className: 'badge' }, t('ui.died'))),
        h(
          'p',
          {},
          t('ui.age', { age: mind.age }),
          ' · ',
          t(`role.${mind.role}`),
          ' · ',
          t(`culture.${mind.culture}`),
        ),
        h('p', {}, t(`region.${mind.region}`), ' · ', t(`country.${mind.country}`)),
      ],
    );
    patch(now, JSON.stringify([frame.hour, mind.activity, mind.festival]), () => [
      h('span', { className: 'clock' }, clock(frame.hour)),
      ' ',
      t(`activity.${mind.activity}`),
      mind.festival
        ? h('span', { className: 'badge festival' }, t(`festival.${mind.festival}`))
        : null,
    ]);
    patch(thoughts, JSON.stringify(mind.thoughts), () =>
      mind.thoughts.map((thought) => h('li', {}, `“${t(thought.key, thought.params)}”`)),
    );
    patch(wellbeing, JSON.stringify(mind.wellbeing), () => [
      h('h3', {}, t('ui.wellbeing')),
      h(
        'table',
        { className: 'rows' },
        h(
          'tr',
          {},
          h('th', {}, ''),
          h('th', { className: 'bri' }, t('ui.bri')),
          h('th', { className: 'shadow' }, t('ui.shadow')),
        ),
        ...mind.wellbeing.map((row) =>
          h(
            'tr',
            {},
            h('td', {}, t(`wellbeing.${row.dimension}`)),
            h('td', {}, bar(row.bri, 'bri'), ` ${pct(row.bri)}`),
            h(
              'td',
              {},
              row.shadow === null
                ? h('em', { className: 'absent' }, t('ui.absent'))
                : h('span', {}, bar(row.shadow, 'shadow'), ` ${pct(row.shadow)}`),
            ),
          ),
        ),
      ),
    ]);
    patch(beliefs, JSON.stringify(mind.beliefs), () => [
      h('h3', {}, t('ui.beliefs')),
      h(
        'p',
        { className: 'hint' },
        h('i', { className: 'key believed' }),
        t('ui.believes'),
        ' ',
        h('i', { className: 'key truth' }),
        t('ui.truth'),
      ),
      h('table', { className: 'rows beliefs' }, ...mind.beliefs.map(beliefRow)),
    ]);
    patch(decision, JSON.stringify(mind.decision), () => {
      const open = mind.decision;
      if (!open) return [];
      return [
        h('h3', {}, t('ui.decision')),
        h('p', {}, t(`decision.${open.kind}.title`)),
        h(
          'div',
          { className: 'options' },
          h('span', { className: 'hint' }, `${t('ui.whisper')}:`),
          ...open.options.map((option) =>
            button(
              t(`decision.${open.kind}.${option}`),
              { type: 'nudge', turningPoint: open.id, option },
              { className: option === open.nudge ? 'whispered' : undefined },
            ),
          ),
        ),
      ];
    });
    patch(household, JSON.stringify([mind.id, mind.household]), () => [
      h('h3', {}, t('ui.household')),
      ...mind.household.map((member) =>
        button(
          member.name,
          { type: 'person', person: member.id },
          { className: member.id === mind.id ? 'active' : undefined },
        ),
      ),
    ]);
    patch(recent, JSON.stringify(mind.recent), () =>
      mind.recent.map((event) =>
        h(
          'li',
          {},
          h('span', { className: 'when' }, weekDate(event.week)),
          t(`life.${event.kind}`, { detail: place(event.detail) }),
        ),
      ),
    );
  };

  return {
    el: h(
      'section',
      { className: 'panel person' },
      h(
        'div',
        { className: 'stage' },
        scene.el,
        now,
        button(
          t('mode.zoom-out'),
          { type: 'mode', mode: 'macro' },
          { className: 'micro-only primary' },
        ),
        h('p', { className: 'micro-only intro' }, t('ui.intro')),
      ),
      h(
        'div',
        { className: 'mind' },
        head,
        h('h3', {}, t('ui.thoughts')),
        thoughts,
        decision,
        wellbeing,
        beliefs,
        household,
        h('h3', {}, t('ui.recent')),
        recent,
      ),
    ),
    render,
  };
}
