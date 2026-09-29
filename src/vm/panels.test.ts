import { describe, expect, it } from 'vitest';
import { createSimulation } from '../sim/simulation';
import { fixtureContent } from '../sim/testing/content.fixture';
import { countryVm, feedVm, mindVm, nameOf } from './panels';

const content = fixtureContent();
const simulation = createSimulation(content, { seed: 5, people: 40 });
for (let i = 0; i < 30; i++) simulation.step();
const { twins } = simulation;

describe('country panel', () => {
  it('compares the BRI and shadow worlds on each measure', () => {
    const vm = countryVm(twins, content, 'AAA');
    expect(vm.id).toBe('AAA');
    const keys = vm.rows.map((row) => row.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'metric.gdp',
        'metric.gdpPerPerson',
        'metric.debtDistress',
        'metric.chinaDebt',
        'metric.wellbeing.income',
      ]),
    );
    const gdp = vm.rows.find((row) => row.key === 'metric.gdp');
    expect(gdp?.bri).toBeGreaterThan(0);
    expect(gdp?.shadow).toBeGreaterThan(0);
    expect(countryVm(twins, content, 'NONE').rows.every((row) => row.bri === 0)).toBe(true);
  });
});

describe('story feed', () => {
  it('turns decisions and life events into balanced, newest-first stories', () => {
    const world = twins.bri;
    const person = world.people.find((p) => p.deathWeek === null);
    if (!person) throw new Error('fixture');
    person.log.push({ week: world.week, kind: 'displaced', detail: person.region });
    person.log.push({ week: world.week, kind: 'job', detail: 'construction-worker' });
    const feed = feedVm(world, content, 10);
    expect(feed.length).toBeGreaterThan(1);
    expect(feed.length).toBeLessThanOrEqual(10);
    expect(feed.map((item) => item.key)).toEqual(
      expect.arrayContaining(['feed.displaced', 'feed.job']),
    );
    for (let i = 1; i < feed.length; i++)
      expect((feed[i - 1]?.week ?? 0) >= (feed[i]?.week ?? 0)).toBe(true);
    expect(feed.some((item) => item.tone === 'down')).toBe(true);
    expect(feed.some((item) => item.tone === 'up')).toBe(true);
    const story = feed.find((item) => item.key === 'feed.displaced');
    expect(story?.params.name).toBe(nameOf(content, person));
  });
});

describe('mind view', () => {
  it('shows a person, their twin, beliefs against truth, thoughts and their scene', () => {
    const person = twins.bri.people.find((p) => p.deathWeek === null && p.role !== 'child');
    if (!person) throw new Error('fixture');
    const vm = mindVm(twins, content, person.id, 30);
    expect(vm.name).toBe(nameOf(content, person));
    expect(vm.wellbeing).toHaveLength(6);
    expect(vm.wellbeing[0]?.shadow).not.toBeNull();
    expect(vm.beliefs.length).toBeGreaterThan(0);
    for (const belief of vm.beliefs) expect(belief.truth).toBeGreaterThanOrEqual(0);
    expect(vm.thoughts.length).toBeGreaterThan(0);
    expect(vm.sprite.pixels.length).toBe(96);
    expect(vm.scene.pixels.length).toBe(160 * 90);
    expect(vm.activity).toBeTruthy();
    expect(vm.household.map((m) => m.id)).toContain(person.id);
  });

  it('shows an open decision and handles people who died or diverged in the shadow world', () => {
    const person = twins.bri.people.find((p) => p.deathWeek === null && p.role !== 'child');
    if (!person) throw new Error('fixture');
    twins.bri.turningPoints.push({
      id: 'd',
      person: person.id,
      kind: 'protest',
      week: 0,
      options: ['join', 'stay-home'],
      nudge: null,
      chosen: null,
      decidedWeek: null,
      reasons: [],
    });
    const twin = twins.shadow.people[person.id];
    if (twin) twin.deathWeek = 1;
    const vm = mindVm(twins, content, person.id, 30);
    expect(vm.decision).toMatchObject({ id: 'd', options: ['join', 'stay-home'] });
    expect(vm.wellbeing[0]?.shadow).toBeNull();
    expect(() => mindVm(twins, content, 99999, 0)).toThrow(/person/);
  });

  it('orders names by culture', () => {
    expect(
      nameOf(
        { ...content, cultures: [{ ...content.cultures[0], nameOrder: 'family-first' } as never] },
        { given: 'Wei', family: 'Wang', culture: 'han' },
      ),
    ).toBe('Wang Wei');
    expect(nameOf(content, { given: 'Anna', family: 'Petrova', culture: 'rus' })).toBe(
      'Anna Petrova',
    );
  });
});
