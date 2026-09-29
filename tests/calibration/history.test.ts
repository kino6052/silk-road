import { describe, expect, it } from 'vitest';
import { dateToWeek } from '../../src/core/calendar';
import { CONTENT } from '../../src/content';
import { createPipeline, createTwins, stepTwins, type Twins } from '../../src/sim/engine/engine';
import { macroSystems } from '../../src/sim/simulation';
import { createWorld } from '../../src/sim/world/world';

// The macro model runs from September 2013 on the real content and must reproduce the broad
// shape of history. Tolerances are wide: these guard the realism, not exact numbers.
const pipeline = createPipeline(macroSystems(CONTENT));
const twins: Twins = createTwins(2013, (options) =>
  createWorld(CONTENT, { ...options, people: 0 }),
);
const snapshots = new Map<string, Twins>();
const weekOf = (year: number, month: number) => dateToWeek({ year, month, day: 1 });
const checkpoints = {
  '2017-01': weekOf(2017, 1),
  '2020-01': weekOf(2020, 1),
  '2023-06': weekOf(2023, 6),
};
for (const [label, week] of Object.entries(checkpoints)) {
  while (twins.bri.week < week) stepTwins(twins, pipeline);
  snapshots.set(label, structuredClone(twins));
}
const at = (label: keyof typeof checkpoints) => snapshots.get(label) as Twins;

describe('history calibration', () => {
  it('opens the Middle Corridor links on their historical dates', () => {
    expect(at('2017-01').bri.links['tbilisi~kars~rail']?.open).toBe(false);
    expect(at('2020-01').bri.links['tbilisi~kars~rail']?.open).toBe(true);
    expect(at('2020-01').bri.links['aktau~tehran~rail']?.open).toBe(true);
  });

  it('cleans up Chinese air by roughly a third from 2013 to 2020', () => {
    const start =
      createWorld(CONTENT, { seed: 2013, bri: true, people: 0 }).regions['CHN-BJ']?.pollution ?? 0;
    const later = at('2020-01').bri.regions['CHN-BJ']?.pollution ?? 0;
    expect(later / start).toBeGreaterThan(0.5);
    expect(later / start).toBeLessThan(0.8);
  });

  it('sanctions Russia heavily after 2022 and eases then re-tightens Iran', () => {
    expect(at('2020-01').bri.countries.RUS?.sanctions).toBeLessThan(0.3);
    expect(at('2023-06').bri.countries.RUS?.sanctions).toBeGreaterThanOrEqual(0.5);
    expect(at('2017-01').bri.countries.IRN?.sanctions).toBeLessThan(0.6);
    expect(at('2023-06').bri.countries.IRN?.sanctions).toBeGreaterThanOrEqual(0.5);
  });

  it('puts Pakistan and Egypt under debt stress by 2023, but not Kazakhstan', () => {
    const { countries } = at('2023-06').bri;
    expect(countries.PAK?.debtDistress).toBeGreaterThan(0.5);
    expect(countries.EGY?.debtDistress).toBeGreaterThan(0.5);
    expect(countries.KAZ?.debtDistress).toBeLessThan(0.4);
    expect(countries.PAK?.chinaDebt).toBeGreaterThan(1);
  });

  it('shows a BRI dividend in Pakistani GDP compared with the shadow world', () => {
    const { bri, shadow } = at('2020-01');
    expect(bri.countries.PAK?.gdp).toBeGreaterThan(shadow.countries.PAK?.gdp ?? Infinity);
    expect(shadow.links['zabaykalsk~beijing~pipeline']?.open).toBe(true);
    expect(shadow.links['tashkent~andijan~rail']?.open).toBe(false);
  });
});
