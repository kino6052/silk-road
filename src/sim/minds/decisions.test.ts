import { describe, expect, it } from 'vitest';
import { createPipeline, stepWorld } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, type World } from '../world/world';
import { createDecisionsSystem, DECISION_WEEKS, nudge } from './decisions';

const content = fixtureContent();
const pipeline = createPipeline([createDecisionsSystem(content)]);

const run = (weeks: number, setup: (world: World) => void = () => undefined, bri = true): World => {
  const world = createWorld(content, { seed: 11, bri, people: 200 });
  setup(world);
  for (let i = 0; i < weeks; i++) stepWorld(world, pipeline);
  return world;
};

/** A world where AAA-ONE is building a BRI project and many people there are out of work. */
const boomTown = (w: World) => {
  const project = w.projects['rail-ab'];
  if (project) project.status = 'construction';
  for (const person of w.people)
    if (person.region === 'AAA-ONE' && person.role === 'office-worker') person.role = 'unemployed';
};

describe('decisions system', () => {
  it('raises job offers at BRI construction sites for people out of work', () => {
    const world = run(52, boomTown);
    const offers = world.turningPoints.filter((tp) => tp.kind === 'job-offer');
    expect(offers.length).toBeGreaterThan(0);
    const regions = new Set(offers.map((tp) => world.people[tp.person]?.region));
    expect(regions.has('AAA-ONE')).toBe(true);
    // Only where the Belt and Road is building: the site, or AAA's other corridor region.
    expect([...regions].every((r) => r === 'AAA-ONE' || r === 'AAA-TWO')).toBe(true);
    expect(
      run(52, boomTown, false).turningPoints.filter((tp) => tp.kind === 'job-offer'),
    ).toHaveLength(0);
  });

  it('lets people decide on their own after the decision window, with reasons', () => {
    const world = run(52, boomTown);
    const decided = world.turningPoints.filter((tp) => tp.chosen !== null);
    expect(decided.length).toBeGreaterThan(0);
    for (const tp of decided) {
      expect(tp.options).toContain(tp.chosen);
      expect((tp.decidedWeek ?? 0) - tp.week).toBeGreaterThanOrEqual(DECISION_WEEKS);
      expect(tp.reasons.length).toBeGreaterThan(0);
      expect(world.people[tp.person]?.log.some((e) => e.kind === 'decided')).toBe(true);
    }
    const hired = decided.filter((tp) => tp.kind === 'job-offer' && tp.chosen === 'accept');
    for (const tp of hired) expect(world.people[tp.person]?.role).toBe('construction-worker');
    const onSite = hired.filter((tp) => world.people[tp.person]?.region === 'AAA-ONE');
    expect(onSite.length).toBeGreaterThan(0);
    for (const tp of onSite) expect(world.people[tp.person]?.employer).toBe('rail-ab');
  });

  it('weighs a nudge, which people sometimes follow and sometimes refuse', () => {
    const world = createWorld(content, { seed: 11, bri: true, people: 200 });
    boomTown(world);
    let pending = null;
    let nudged = 0;
    for (let i = 0; i < 104; i++) {
      stepWorld(world, pipeline);
      for (const tp of world.turningPoints) {
        if (tp.chosen === null && tp.nudge === null && tp.kind === 'job-offer') {
          pending = nudge(world, tp.id, 'decline');
          nudged++;
        }
      }
    }
    expect(nudged).toBeGreaterThan(1);
    expect(pending).toMatchObject({ kind: 'job-offer', option: 'decline' });
    const outcomes = world.turningPoints.filter((tp) => tp.nudge !== null && tp.chosen !== null);
    expect(
      outcomes.some((tp) => tp.chosen === 'decline' && tp.reasons.includes('reason.nudged')),
    ).toBe(true);
    expect(nudge(world, 'no-such-id', 'decline')).toBeNull();
    const decided = outcomes[0];
    expect(decided && nudge(world, decided.id, 'accept')).toBeNull();
    expect(() => {
      const open = world.turningPoints.find((tp) => tp.chosen === null);
      if (open) nudge(world, open.id, 'fly-away');
      else throw new Error('invalid option');
    }).toThrow(/option/);
  });

  it('applies mirrored nudges to matching turning points in another world', () => {
    const queued = new Set<number>();
    const world = run(52, (w) => {
      boomTown(w);
      for (const person of w.people) {
        if (person.region !== 'AAA-ONE') continue;
        queued.add(person.id);
        w.pendingNudges.push({
          person: person.id,
          kind: 'job-offer',
          option: 'decline',
          untilWeek: 1000,
        });
      }
    });
    const offers = world.turningPoints.filter(
      (tp) => tp.kind === 'job-offer' && queued.has(tp.person),
    );
    expect(offers.length).toBeGreaterThan(0);
    // Each mirrored nudge applies once: to the person's first matching turning point.
    const firsts = offers.filter((tp) => offers.find((o) => o.person === tp.person) === tp);
    expect(firsts.every((tp) => tp.nudge === 'decline')).toBe(true);
    expect(world.pendingNudges.length).toBeLessThan(queued.size);
  });

  it('drops expired pending nudges and keeps the record of turning points bounded', () => {
    const world = run(30, (w) => {
      w.pendingNudges.push({ person: 0, kind: 'bribe', option: 'refuse', untilWeek: 5 });
    });
    expect(world.pendingNudges).toHaveLength(0);
    expect(world.stats['decisions.unmirrored']).toBe(1);
  });

  it('raises the other kinds of turning points from their situations', () => {
    const world = run(208, (w) => {
      boomTown(w);
      for (const region of Object.values(w.regions))
        Object.assign(region, { pollution: 120, unemployment: 0.3 });
      for (const person of w.people) {
        if (person.role !== 'child') {
          person.beliefs['pollution:' + person.region] = {
            value: 0.95,
            confidence: 0.9,
            source: 'own-eyes',
            since: 0,
          };
          person.wellbeing.outlook = 0.1;
        }
        if (person.role === 'teacher' || person.role === 'nurse') person.role = 'local-official';
        if (person.role === 'farmer')
          person.log.push({ week: 0, kind: 'displaced', detail: person.region });
      }
    });
    for (const kind of ['job-offer', 'relocation', 'protest', 'emigrate', 'bribe', 'speak-out']) {
      expect(world.stats[`decisions.raised.${kind}`], kind).toBeGreaterThan(0);
      expect(world.stats[`decisions.decided.${kind}`], kind).toBeGreaterThan(0);
    }
    expect(world.turningPoints.length).toBeLessThanOrEqual(400);
  });

  it('records refused nudges and closes turning points of people who died', () => {
    const world = createWorld(content, { seed: 11, bri: true, people: 40 });
    const [keen, gone] = world.people.filter((p) => p.role !== 'child' && p.role !== 'student');
    if (!keen || !gone) throw new Error('fixture');
    Object.assign(keen, { traits: { ...keen.traits, ambition: 1, risk: 1 } });
    keen.wellbeing.income = 0;
    const open = (person: number, kind: 'job-offer' | 'emigrate') => ({
      id: `t:${String(person)}`,
      person,
      kind,
      week: 0,
      options: kind === 'job-offer' ? ['accept', 'decline'] : ['leave', 'stay'],
      nudge: null,
      chosen: null,
      decidedWeek: null,
      reasons: [],
    });
    world.turningPoints.push(open(keen.id, 'job-offer'), open(gone.id, 'emigrate'));
    nudge(world, `t:${String(keen.id)}`, 'decline');
    gone.deathWeek = 0;
    for (let i = 0; i < DECISION_WEEKS + 1; i++) stepWorld(world, pipeline);
    const [refused, closed] = world.turningPoints;
    expect(refused).toMatchObject({ chosen: 'accept' });
    expect(refused?.reasons[0]).toBe('reason.refused-nudge');
    expect(closed).toMatchObject({ chosen: 'stay', reasons: ['reason.died'] });
  });

  it('offers Belt and Road jobs wherever it is building, and remembers the employer', () => {
    const struggling = (w: World) => {
      for (const person of w.people)
        if (person.region === 'AAA-TWO' && person.role !== 'child') person.role = 'unemployed';
    };
    const bri = run(104, struggling);
    const offers = bri.turningPoints.filter(
      (tp) => tp.kind === 'job-offer' && bri.people[tp.person]?.region === 'AAA-TWO',
    );
    expect(offers.length).toBeGreaterThan(0);
    const hired = offers.filter((tp) => tp.chosen === 'accept').map((tp) => bri.people[tp.person]);
    expect(hired.length).toBeGreaterThan(0);
    for (const person of hired) expect(person?.employer).toBe('bri:AAA');
    const shadow = run(104, struggling, false);
    expect(
      shadow.turningPoints.some(
        (tp) => tp.kind === 'job-offer' && shadow.people[tp.person]?.region === 'AAA-TWO',
      ),
    ).toBe(false);
  });
});
