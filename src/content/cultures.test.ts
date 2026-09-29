import { describe, expect, it } from 'vitest';
import { CULTURES } from './cultures';

const MUSLIM = new Set(['sunni', 'shia']);

describe('culture content', () => {
  it('are exactly the 27 cultures used across the corridor', () => {
    expect(CULTURES.map((culture) => culture.id).sort()).toEqual(
      [
        'han',
        'uyghur',
        'kazakh',
        'hui',
        'tibetan',
        'russian',
        'tatar',
        'uzbek',
        'tajik',
        'belarusian',
        'polish',
        'german',
        'turkish',
        'kurdish',
        'arab',
        'azerbaijani',
        'persian',
        'baloch',
        'pashtun',
        'punjabi',
        'sindhi',
        'urdu',
        'gilgiti',
        'egyptian',
        'copt',
        'greek',
        'albanian',
      ].sort(),
    );
  });

  it('have trimmed, non-empty, unique names in every list', () => {
    for (const culture of CULTURES) {
      const lists = {
        female: culture.givenNames.female,
        male: culture.givenNames.male,
        family: culture.familyNames,
        familyFemale: culture.familyNamesFemale ?? [],
      };
      for (const [kind, names] of Object.entries(lists)) {
        const label = `${culture.id} ${kind}`;
        expect(new Set(names).size, label).toBe(names.length);
        for (const name of names) {
          expect(name, label).toBe(name.trim());
          expect(name.length, label).toBeGreaterThan(0);
        }
      }
    }
  });

  it('give female surname forms in the same shape as the family names', () => {
    for (const culture of CULTURES) {
      if (culture.familyNamesFemale === undefined) continue;
      expect(culture.familyNamesFemale.length, culture.id).toBe(culture.familyNames.length);
    }
  });

  it('keep the festivals of the majority religion', () => {
    for (const culture of CULTURES) {
      if (MUSLIM.has(culture.religion)) {
        expect(culture.festivals, culture.id).toContain('eid-al-fitr');
      }
      if (culture.religion === 'orthodox') {
        expect(culture.festivals, culture.id).toContain('orthodox-easter');
      }
    }
  });
});
