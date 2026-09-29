import { describe, expect, it } from 'vitest';
import { civilFromDays, daysFromCivil } from '../core/calendar';
import type { CivilDate } from '../core/calendar';
import { en } from '../i18n/en';
import { COUNTRIES } from './countries';
import { EVENTS } from './events';
import { REGIONS } from './regions';
import type { EventEffect } from './types';

const catalog: Record<string, string> = en;
const COUNTRY_IDS = new Set(COUNTRIES.map((country) => country.id));
const REGION_IDS = new Set(REGIONS.map((region) => region.id));
const NODE_IDS: ReadonlySet<string> = new Set([
  'khorgos',
  'alashankou',
  'dostyk',
  'khorgos-gateway',
  'suez-canal',
  'bab-el-mandeb',
  'hormuz',
  'malacca',
  'bosporus',
  'gwadar',
  'piraeus',
  'brest',
  'malaszewicze',
  'zabaykalsk',
  'manzhouli',
  'erenhot',
  'kuryk',
  'aktau',
  'baku-alat',
  'kars',
  'karachi',
  'bandar-abbas',
  'port-said',
  'ain-sokhna',
  'duisburg',
  'hamburg',
]);
/** Every effect kind except 'bri-membership' must appear at least once. */
const REQUIRED_KINDS: readonly EventEffect['kind'][] = [
  'announcement',
  'sanctions',
  'sanctions-eased',
  'trade-shock',
  'route-disruption',
  'tariff',
  'bloc-join',
  'bloc-leave',
  'imf-program',
  'debt-distress',
  'policy',
  'disaster',
  'conflict',
  'security-attack',
  'pandemic',
];
const FIRST_DAY = daysFromCivil({ year: 2013, month: 9, day: 1 });
const LAST_DAY = daysFromCivil({ year: 2025, month: 12, day: 31 });

const unit = (value: number) => value >= 0 && value <= 1;
const isRealDate = (date: CivilDate) => {
  const back = civilFromDays(daysFromCivil(date));
  return back.year === date.year && back.month === date.month && back.day === date.day;
};

interface References {
  readonly countries: readonly string[];
  readonly regions: readonly string[];
  readonly nodes: readonly string[];
  /** Values that must lie in [0, 1]. */
  readonly units: readonly number[];
  /** Durations that must be positive. */
  readonly weeks: readonly number[];
}

/** Everything an effect points at or scales by, so one loop can check them all. */
function references(effect: EventEffect): References {
  const none: References = { countries: [], regions: [], nodes: [], units: [], weeks: [] };
  switch (effect.kind) {
    case 'announcement':
      return none;
    case 'sanctions':
      return { ...none, countries: [effect.target, ...effect.by], units: [effect.severity] };
    case 'sanctions-eased':
      return { ...none, countries: [effect.target, ...effect.by] };
    case 'trade-shock':
      return {
        ...none,
        countries: effect.scope === 'world' ? [] : [effect.scope],
        units: [effect.factor],
        weeks: [effect.weeks],
      };
    case 'route-disruption':
      return { ...none, nodes: [effect.node], units: [effect.factor], weeks: [effect.weeks] };
    case 'tariff':
      return { ...none, countries: [effect.by, effect.on] };
    case 'bloc-join':
    case 'bloc-leave':
    case 'bri-membership':
    case 'imf-program':
      return { ...none, countries: [effect.country] };
    case 'debt-distress':
      return { ...none, countries: [effect.country], units: [effect.severity] };
    case 'policy':
      return { ...none, countries: [effect.actor] };
    case 'disaster':
    case 'security-attack':
      return { ...none, regions: [effect.region], units: [effect.severity] };
    case 'conflict':
      return {
        ...none,
        countries: [effect.country],
        units: [effect.severity],
        weeks: [effect.weeks],
      };
    case 'pandemic':
      return { ...none, units: [effect.severity], weeks: [effect.weeks] };
  }
}

describe('historical events', () => {
  it('number at least 45, with unique ids', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(45);
    expect(new Set(EVENTS.map((event) => event.id)).size).toBe(EVENTS.length);
  });

  it('fall on real calendar dates from September 2013 to 2025, sorted by date', () => {
    const days = EVENTS.map((event) => daysFromCivil(event.date));
    for (const event of EVENTS) {
      expect(isRealDate(event.date), event.id).toBe(true);
      const day = daysFromCivil(event.date);
      expect(day >= FIRST_DAY && day <= LAST_DAY, event.id).toBe(true);
    }
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('are historical, sourced, have effects and name only known actors', () => {
    for (const event of EVENTS) {
      expect(event.provenance, event.id).toBe('historical');
      expect(event.source.trim(), event.id).not.toBe('');
      expect(event.effects.length, event.id).toBeGreaterThan(0);
      expect(event.actors.length, event.id).toBeGreaterThan(0);
      for (const actor of event.actors) {
        expect(COUNTRY_IDS.has(actor), `${event.id}: ${actor}`).toBe(true);
      }
    }
  });

  it('have effects that reference known countries, regions and nodes with sane values', () => {
    for (const event of EVENTS) {
      for (const effect of event.effects) {
        const refs = references(effect);
        const where = `${event.id}: ${effect.kind}`;
        for (const id of refs.countries) expect(COUNTRY_IDS.has(id), `${where} ${id}`).toBe(true);
        for (const id of refs.regions) expect(REGION_IDS.has(id), `${where} ${id}`).toBe(true);
        for (const id of refs.nodes) expect(NODE_IDS.has(id), `${where} ${id}`).toBe(true);
        for (const value of refs.units) expect(unit(value), `${where} ${value}`).toBe(true);
        for (const weeks of refs.weeks) expect(weeks, where).toBeGreaterThan(0);
        if (effect.kind === 'announcement') expect(effect.topic, where).not.toBe('');
        if (effect.kind === 'tariff') expect(effect.rate, where).toBeGreaterThanOrEqual(0);
        if (effect.kind === 'imf-program') expect(effect.amountBn, where).toBeGreaterThan(0);
      }
    }
  });

  it('cover every kind of effect the simulation models', () => {
    const kinds = new Set(EVENTS.flatMap((event) => event.effects.map((effect) => effect.kind)));
    for (const kind of REQUIRED_KINDS) expect(kinds.has(kind), kind).toBe(true);
  });

  it('have a title and a summary', () => {
    for (const event of EVENTS) {
      expect(catalog[`event.${event.id}.title`], event.id).toBeTruthy();
      expect(catalog[`event.${event.id}.summary`], event.id).toBeTruthy();
    }
  });
});
