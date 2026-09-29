import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, type World } from '../world/world';
import {
  BRI_WAGE_PREMIUM,
  createPay,
  LOGISTICS_CAP,
  OTHER_PROJECT_PREMIUM,
  TRADE_SPILLOVER,
} from './pay';
import type { Person } from './types';

const content = fixtureContent();
const pay = createPay(content);
const world = (bri: boolean, week = 20): World => {
  const w = createWorld(content, { seed: 1, bri, people: 12 });
  w.week = week;
  return w;
};
const someone = (w: World, changes: Partial<Person>): Person => ({
  ...(w.people[0] as Person),
  ...changes,
});

describe('pay', () => {
  it('pays a premium to people working for the Belt and Road, a smaller one on other projects', () => {
    const w = world(true);
    expect(pay.factor(w, someone(w, { role: 'construction-worker', employer: 'bri:AAA' }))).toBe(
      BRI_WAGE_PREMIUM,
    );
    expect(pay.factor(w, someone(w, { role: 'construction-worker', employer: 'rail-ab' }))).toBe(
      BRI_WAGE_PREMIUM,
    );
    expect(pay.factor(w, someone(w, { role: 'construction-worker', employer: 'port-b' }))).toBe(
      OTHER_PROJECT_PREMIUM,
    );
    expect(
      pay.factor(w, someone(w, { role: 'office-worker', employer: null, region: 'AAA-REST' })),
    ).toBe(1);
  });

  it('raises logistics pay as the region’s freight grows beyond its first level, up to a cap', () => {
    const w = world(true);
    const region = w.regions['AAA-ONE'];
    if (!region) throw new Error('fixture');
    const driver = someone(w, { role: 'truck-driver', employer: null, region: 'AAA-ONE' });
    pay.track(w);
    expect(pay.factor(w, driver)).toBe(1);
    region.throughput = 1000;
    pay.track(w);
    expect(pay.factor(w, driver)).toBe(1);
    region.throughput = 2000;
    pay.track(w);
    expect(pay.factor(w, driver)).toBeGreaterThan(1);
    region.throughput = 1e9;
    expect(pay.factor(w, driver)).toBe(1 + LOGISTICS_CAP);
  });

  it('knows where the Belt and Road is at work, and lets local traders share in it', () => {
    const bri = world(true);
    const shadow = world(false);
    expect(pay.briWorks(bri, 'AAA-TWO')).toBe(true);
    expect(pay.briWorks(bri, 'AAA-REST')).toBe(false);
    expect(pay.briWorks(shadow, 'AAA-TWO')).toBe(false);
    expect(pay.briWorks(bri, 'BBB-REST')).toBe(false);
    const project = bri.projects['rail-ab'];
    if (project) project.status = 'construction';
    expect(pay.briWorks(bri, 'AAA-ONE')).toBe(true);
    const trader = (w: World) =>
      someone(w, { role: 'market-trader', employer: null, region: 'AAA-TWO' });
    expect(pay.factor(bri, trader(bri))).toBe(1 + TRADE_SPILLOVER);
    expect(pay.factor(shadow, trader(shadow))).toBe(1);
  });
});
