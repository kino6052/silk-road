import { required } from '../../core/required';
import { createRng, type Rng } from '../../core/rng';
import type { Content, Culture, Demography, Region } from '../../content/types';
import {
  NON_WORKING,
  ROLE_INCOME,
  personalFactor,
  pickWeighted,
  sampleWorkRole,
  storyRoles,
  type RegionFeatures,
} from './roles';
import type { Household, Person, Role, Traits } from './types';

export const PEOPLE_PER_WORLD = 2000;
/** Every region gets at least this many people so its stories can be told. */
export const MIN_PER_REGION = 12;
const INITIAL_UNEMPLOYMENT = 0.06;

export interface Population {
  people: Person[];
  households: Household[];
}

const MINING = new Set([
  'KAZ-REST',
  'KAZ-AKT',
  'RUS-SIB',
  'UZB-REST',
  'AZE-BAK',
  'IRN-REST',
  'PAK-BAL',
  'CHN-XJ',
  'CHN-REST',
]);

/** What each region's geography and projects make possible, from content. */
export function regionFeatures(content: Content): Map<string, RegionFeatures> {
  const has = (predicate: (regionId: string | null, kind: string) => boolean) => (id: string) =>
    content.nodes.some((node) => node.region === id && predicate(node.region, node.kind));
  const port = has((_, kind) => kind === 'port');
  const border = has((_, kind) => kind === 'border' || kind === 'dry-port');
  return new Map(
    content.regions.map((region) => [
      region.id,
      {
        port: port(region.id),
        border: border(region.id),
        project: content.projects.some((project) => project.region === region.id),
        mining: MINING.has(region.id),
        pastoral: region.climate !== 'subtropical' && region.employment.agriculture > 0.2,
      },
    ]),
  );
}

/** Average income per person in a region in 2013 (international-$). */
export function regionIncome(content: Content, region: Region): number {
  const start = content.indicators[region.country]?.['2013'];
  const perPerson = start?.gdp && start.population ? start.gdp / start.population : 0;
  return perPerson * region.income;
}

const DEFAULT_DEMOGRAPHY: Demography = {
  householdSize: 3.5,
  homemakerShare: 0.3,
  retirementAge: 62,
  education: 0.6,
  fertility: 2,
  lifeExpectancy: 72,
};

export const demographyOf = (content: Content, country: string): Demography =>
  content.demography[country] ?? DEFAULT_DEMOGRAPHY;

const pickCulture = (rng: Rng, region: Region): string =>
  pickWeighted(rng, Object.entries(region.groups));

/** A culture's family name for index `index`, in the form for `sex`. */
export const familyName = (culture: Culture, index: number, sex: 'f' | 'm'): string =>
  (sex === 'f' ? culture.familyNamesFemale : undefined)?.[index] ??
  (culture.familyNames[index] as string);

export const givenName = (rng: Rng, culture: Culture, sex: 'f' | 'm'): string =>
  rng.pick(sex === 'f' ? culture.givenNames.female : culture.givenNames.male);

export const randomTraits = (rng: Rng): Traits => ({
  openness: rng.float(),
  risk: rng.float(),
  conformity: rng.float(),
  honesty: rng.float(),
  ambition: rng.float(),
});

interface Member {
  readonly age: number;
  readonly sex: 'f' | 'm';
  readonly familyIndex: number;
  readonly kind: 'head' | 'spouse' | 'child' | 'elder';
}

/** Draws a plausible household: a head, often a spouse, children, sometimes an elder. */
function drawMembers(rng: Rng, culture: Culture, demography: Demography): Member[] {
  const familyIndex = () => rng.int(0, culture.familyNames.length);
  const headAge = rng.int(25, 70);
  const married = rng.chance(headAge < 65 ? 0.85 : 0.6);
  const headSex = rng.chance(married ? 0.8 : 0.5) ? 'm' : 'f';
  const head: Member = { age: headAge, sex: headSex, familyIndex: familyIndex(), kind: 'head' };
  const members: Member[] = [head];
  if (married) {
    const gendered = culture.familyNamesFemale !== undefined;
    const spouseSex = headSex === 'm' ? 'f' : 'm';
    const age = headSex === 'm' ? headAge - rng.int(0, 6) : headAge + rng.int(0, 5);
    const index = gendered && spouseSex === 'f' ? head.familyIndex : familyIndex();
    members.push({ age, sex: spouseSex, familyIndex: index, kind: 'spouse' });
  }
  const father = members.find((member) => member.sex === 'm') ?? head;
  const base = Math.max(0, demography.householdSize - 2);
  const children = Math.min(7, Math.floor(rng.float() * (2 * base + 1)));
  for (let i = 0; i < children; i++) {
    const age = headAge - 20 - rng.int(0, 15);
    if (age < 0) continue;
    const sex = rng.chance(0.5) ? 'f' : 'm';
    members.push({ age, sex, familyIndex: father.familyIndex, kind: 'child' });
  }
  if (rng.chance(demography.householdSize >= 3.5 ? 0.15 : 0.05) && headAge < 50) {
    const sex = rng.chance(0.6) ? 'f' : 'm';
    members.push({
      age: headAge + 25 + rng.int(0, 10),
      sex,
      familyIndex: head.familyIndex,
      kind: 'elder',
    });
  }
  return members;
}

/** An adult's role at generation time or when leaving school. */
export function adultRole(
  rng: Rng,
  age: number,
  sex: 'f' | 'm',
  education: number,
  region: Region,
  features: RegionFeatures,
  demography: Demography,
): Role {
  if (age >= demography.retirementAge) return 'retiree';
  if (age <= 22 && rng.float() < education * 0.6) return 'student';
  if (sex === 'f' && rng.chance(demography.homemakerShare)) return 'homemaker';
  if (rng.chance(INITIAL_UNEMPLOYMENT)) return 'unemployed';
  return sampleWorkRole(rng, region, features);
}

const roleForAge = (age: number): Role | null => (age < 6 ? 'child' : age < 18 ? 'student' : null);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Generates the sample population, identical in the BRI and shadow worlds. */
export function generatePopulation(content: Content, seed: number, target: number): Population {
  const features = regionFeatures(content);
  const cultures = new Map(content.cultures.map((culture) => [culture.id, culture]));
  const weights = content.regions.map((region) => Math.sqrt(region.population));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const people: Person[] = [];
  const households: Household[] = [];

  content.regions.forEach((region, regionIndex) => {
    const quota = Math.max(
      MIN_PER_REGION,
      Math.round((target * (weights[regionIndex] as number)) / totalWeight),
    );
    const regionFeature = features.get(region.id) as RegionFeatures;
    const demography = demographyOf(content, region.country);
    const regionPeople: Person[] = [];
    while (regionPeople.length < quota) {
      const householdId = households.length;
      const rng = createRng({ seed, stream: 'people.household', entity: householdId, tick: 0 });
      const culture = cultures.get(pickCulture(rng, region)) as Culture;
      const household: Household = {
        id: householdId,
        region: region.id,
        members: [],
        wealth: 0,
        landHa: 0,
      };
      households.push(household);
      const members = drawMembers(rng, culture, demography);
      const start = people.length;
      const parent = (sex: 'f' | 'm') => {
        const index = members.findIndex(
          (m) => (m.kind === 'head' || m.kind === 'spouse') && m.sex === sex,
        );
        return index < 0 ? null : start + index;
      };
      for (const member of members) {
        const id = people.length;
        const education = clamp01(
          demography.education + (rng.float() - 0.5) * 0.4 + (region.urban - 0.5) * 0.2,
        );
        const isChild = member.kind === 'child';
        const person: Person = {
          id,
          household: householdId,
          region: region.id,
          birthRegion: region.id,
          culture: culture.id,
          sex: member.sex,
          // `0 - x` rather than `-x`: a newborn must get +0, which survives JSON, not -0.
          birthWeek: 0 - (member.age * 52 + rng.int(0, 52)),
          deathWeek: null,
          given: givenName(rng, culture, member.sex),
          family: familyName(culture, member.familyIndex, member.sex),
          role:
            roleForAge(member.age) ??
            adultRole(rng, member.age, member.sex, education, region, regionFeature, demography),
          income: 0,
          education,
          genes: rng.next(),
          traits: randomTraits(rng),
          wellbeing: {
            income: 0.5,
            health: 0.5,
            security: 0.5,
            freedom: 0.5,
            belonging: 0.5,
            outlook: 0.5,
          },
          spouse: null,
          mother: isChild ? parent('f') : null,
          father: isChild ? parent('m') : null,
          log: [],
          beliefs: {},
          employer: null,
          employer: null,
        };
        people.push(person);
        regionPeople.push(person);
        household.members.push(id);
      }
      if (members[1]?.kind === 'spouse') {
        required(people[start], 'head').spouse = start + 1;
        required(people[start + 1], 'spouse').spouse = start;
      }
    }
    // Guarantee story roles by re-assigning working adults in non-story roles.
    const wanted = storyRoles(regionFeature);
    for (const role of wanted) {
      if (regionPeople.some((person) => person.role === role)) continue;
      const candidates = regionPeople.filter(
        (person) => !NON_WORKING.has(person.role) && !wanted.includes(person.role),
      );
      for (const candidate of candidates.slice(0, 1)) candidate.role = role;
    }
    const income = regionIncome(content, region);
    for (const person of regionPeople) {
      person.income = income * ROLE_INCOME[person.role] * personalFactor(person.genes);
    }
  });

  for (const household of households) {
    const members = household.members.map((id) => people[id] as Person);
    const rng = createRng({ seed, stream: 'people.assets', entity: household.id, tick: 0 });
    if (members.some((person) => person.role === 'farmer' || person.role === 'herder')) {
      household.landHa = 0.5 + rng.float() * 4.5;
    }
    household.wealth =
      members.reduce((sum, person) => sum + person.income, 0) * (0.5 + 2 * rng.float());
  }
  return { people, households };
}
