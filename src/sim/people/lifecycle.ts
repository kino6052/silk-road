import { exp } from '../../core/fixed-math';
import type { Rng } from '../../core/rng';
import type { Content, Culture, Region } from '../../content/types';
import type { System } from '../engine/engine';
import type { World } from '../world/world';
import {
  adultRole,
  demographyOf,
  familyName,
  givenName,
  randomTraits,
  regionFeatures,
} from './generate';
import { NON_WORKING, ROLE_INCOME, personalFactor, sampleWorkRole } from './roles';
import type { LifeEvent, LifeEventKind, Person } from './types';

/** Each person is updated once every four weeks, staggered by id. */
export const MONTH_WEEKS = 4;
const LOG_LIMIT = 12;
const MONTHLY_MARRIAGE = 0.012;
const MONTHLY_MIGRATION = 0.01;
/** Displacement is rare in a 2,000-person sample; over-sample it so stories exist. */
const DISPLACEMENT_OVERSAMPLE = 300;

/** Is this person due for their monthly update this week? */
export const isDue = (person: Person, week: number): boolean =>
  (person.id + week) % MONTH_WEEKS === 0;

export const ageAt = (person: Person, week: number): number => (week - person.birthWeek) / 52;

export function record(person: Person, week: number, kind: LifeEventKind, detail: string): void {
  const event: LifeEvent = { week, kind, detail };
  person.log.push(event);
  if (person.log.length > LOG_LIMIT) person.log.shift();
}

/** Annual probability of dying at `age` (Gompertz curve shifted by life expectancy). */
export function annualMortality(age: number, lifeExpectancy: number): number {
  const frailty = exp(0.08 * (75 - lifeExpectancy));
  const infant = age < 5 ? 0.006 : 0;
  return Math.min(1, (0.0003 + 0.00002 * exp(0.095 * age) + infant) * frailty);
}

/** Moves people through birth, school, work, marriage, migration, displacement and death. */
export function createLifecycleSystem(content: Content): System {
  const features = regionFeatures(content);
  const regions = new Map(content.regions.map((region) => [region.id, region]));
  const cultures = new Map(content.cultures.map((culture) => [culture.id, culture]));

  const die = (world: World, person: Person) => {
    person.deathWeek = world.week;
    record(person, world.week, 'died', person.region);
    const household = world.households[person.household];
    if (household) household.members = household.members.filter((id) => id !== person.id);
    const spouse = person.spouse === null ? undefined : world.people[person.spouse];
    if (spouse) {
      spouse.spouse = null;
      record(spouse, world.week, 'widowed', String(person.id));
    }
    person.spouse = null;
  };

  const moveTo = (world: World, person: Person, householdId: number) => {
    const old = world.households[person.household];
    if (old) old.members = old.members.filter((id) => id !== person.id);
    const target = world.households[householdId];
    if (!target) return;
    target.members.push(person.id);
    person.household = householdId;
    person.region = target.region;
  };

  const displace = (world: World, rng: (entity: number, purpose?: string) => Rng) => {
    for (const region of Object.values(world.regions)) {
      const key = `lifecycle.displacedSeen.${region.id}`;
      const seen = world.stats[key] ?? 0;
      if (region.displaced <= seen) continue;
      world.stats[key] = region.displaced;
      const probability = Math.min(
        0.5,
        ((region.displaced - seen) / region.population) * DISPLACEMENT_OVERSAMPLE,
      );
      for (const household of world.households) {
        if (household.region !== region.id || household.landHa === 0) continue;
        if (!rng(household.id, 'displace').chance(probability)) continue;
        household.wealth += household.landHa * 5000;
        household.landHa = 0;
        for (const id of household.members) {
          const member = world.people[id];
          if (member) record(member, world.week, 'displaced', region.id);
        }
      }
    }
  };

  const work = (world: World, person: Person, rng: Rng, region: Region, age: number) => {
    const state = world.regions[person.region];
    if (!state) return;
    const demography = demographyOf(content, region.country);
    const regionFeature = features.get(region.id);
    if (!regionFeature) return;
    if (person.role === 'child' && age >= 6) person.role = 'student';
    else if (person.role === 'student' && age >= 18 && (age >= 22 || rng.chance(0.3))) {
      person.role = adultRole(rng, age, person.sex, 0, region, regionFeature, demography);
      if (!NON_WORKING.has(person.role)) record(person, world.week, 'job', person.role);
    } else if (
      !['child', 'student', 'retiree'].includes(person.role) &&
      age >= demography.retirementAge
    ) {
      person.role = 'retiree';
      record(person, world.week, 'retired', region.id);
    } else if (person.role === 'unemployed') {
      const pull = Math.min(0.5, (state.jobs.construction / (state.population * 0.45)) * 5);
      const hire = Math.min(0.9, Math.max(0, 0.08 * (1 - 2 * state.unemployment)) + pull);
      if (rng.chance(hire)) {
        person.role = rng.chance(pull / hire)
          ? 'construction-worker'
          : sampleWorkRole(rng, region, regionFeature);
        record(person, world.week, 'job', person.role);
      }
    } else if (!NON_WORKING.has(person.role)) {
      const pandemic = world.effects.some(({ effect }) => effect.kind === 'pandemic') ? 3 : 1;
      if (rng.chance(state.unemployment * 0.03 * pandemic)) {
        record(person, world.week, 'job-lost', person.role);
        person.role = 'unemployed';
      }
    }
    person.income = state.income * ROLE_INCOME[person.role] * personalFactor(person.genes);
  };

  const marry = (
    world: World,
    person: Person,
    rng: Rng,
    singles: Map<string, Person[]>,
    age: number,
  ) => {
    if (person.spouse !== null || age < 20 || age > 40 || !rng.chance(MONTHLY_MARRIAGE)) return;
    const pool = singles.get(person.region) ?? [];
    const partner = pool.find(
      (other) =>
        other.id !== person.id &&
        other.spouse === null &&
        other.sex !== person.sex &&
        other.culture === person.culture &&
        Math.abs(ageAt(other, world.week) - age) <= 10,
    );
    if (!partner) return;
    person.spouse = partner.id;
    partner.spouse = person.id;
    const [husband, wife] = person.sex === 'm' ? [person, partner] : [partner, person];
    const culture = cultures.get(wife.culture);
    const index = culture?.familyNames.indexOf(husband.family) ?? -1;
    if (culture?.familyNamesFemale && index >= 0) wife.family = familyName(culture, index, 'f');
    moveTo(world, wife, husband.household);
    record(person, world.week, 'married', String(partner.id));
    record(partner, world.week, 'married', String(person.id));
  };

  const giveBirth = (world: World, mother: Person, rng: Rng, age: number) => {
    const father = mother.spouse === null ? undefined : world.people[mother.spouse];
    if (mother.sex !== 'f' || !father || age < 18 || age > 45) return;
    const demography = demographyOf(content, regions.get(mother.region)?.country ?? '');
    if (!rng.chance(demography.fertility / 27 / 12)) return;
    const culture = cultures.get(mother.culture) as Culture;
    const sex = rng.chance(0.5) ? 'f' : 'm';
    const index = culture.familyNames.indexOf(father.family);
    const baby: Person = {
      id: world.people.length,
      household: mother.household,
      region: mother.region,
      birthRegion: mother.region,
      culture: culture.id,
      sex,
      birthWeek: world.week,
      deathWeek: null,
      given: givenName(rng, culture, sex),
      family: index >= 0 ? familyName(culture, index, sex) : father.family,
      role: 'child',
      income: 0,
      education: demography.education,
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
      mother: mother.id,
      father: father.id,
      log: [],
    };
    world.people.push(baby);
    world.households[mother.household]?.members.push(baby.id);
    record(mother, world.week, 'child-born', String(baby.id));
    record(father, world.week, 'child-born', String(baby.id));
    world.stats['people.births'] = (world.stats['people.births'] ?? 0) + 1;
  };

  const migrate = (world: World, person: Person, rng: Rng, region: Region, age: number) => {
    if (age < 18 || age > 45 || (person.role !== 'unemployed' && person.wellbeing.income >= 0.3))
      return;
    if (!rng.chance(MONTHLY_MIGRATION)) return;
    const score = (id: string) => {
      const state = world.regions[id];
      return state ? state.income * (1 - state.unemployment) : 0;
    };
    const target = content.regions
      .filter((other) => other.country === region.country && other.id !== region.id)
      .reduce<Region | undefined>(
        (best, other) => (!best || score(other.id) > score(best.id) ? other : best),
        undefined,
      );
    if (!target || score(target.id) <= 1.1 * score(region.id)) return;
    const old = world.households[person.household];
    const householdId = world.households.length;
    const wealth = (old?.wealth ?? 0) / 2;
    if (old) old.wealth -= wealth;
    world.households.push({ id: householdId, region: target.id, members: [], wealth, landHa: 0 });
    const followers = [person.spouse, ...(old?.members ?? [])]
      .map((id) => (id === null ? undefined : world.people[id]))
      .filter(
        (other): other is Person =>
          other !== undefined &&
          (other.id === person.spouse ||
            ((other.mother === person.id || other.father === person.id) &&
              ageAt(other, world.week) < 18)),
      );
    for (const mover of [person, ...new Set(followers)]) {
      moveTo(world, mover, householdId);
      record(mover, world.week, 'moved', target.id);
    }
  };

  return {
    id: 'lifecycle',
    step: (world, ctx) => {
      world.stats['people.births'] = 0;
      displace(world, ctx.rng);
      const singles = new Map<string, Person[]>();
      for (const person of world.people) {
        if (person.deathWeek !== null || person.spouse !== null) continue;
        const age = ageAt(person, world.week);
        if (age < 18 || age > 45) continue;
        const list = singles.get(person.region) ?? [];
        list.push(person);
        singles.set(person.region, list);
      }
      let deaths = 0;
      const count = world.people.length;
      for (let id = 0; id < count; id++) {
        const person = world.people[id] as Person;
        if (person.deathWeek !== null || !isDue(person, world.week)) continue;
        const region = regions.get(person.region);
        if (!region) continue;
        const rng = ctx.rng(person.id);
        const age = ageAt(person, world.week);
        const demography = demographyOf(content, region.country);
        if (rng.chance(annualMortality(age, demography.lifeExpectancy) / 12)) {
          die(world, person);
          deaths++;
          continue;
        }
        work(world, person, rng, region, age);
        marry(world, person, rng, singles, age);
        giveBirth(world, person, rng, age);
        migrate(world, person, rng, region, age);
      }
      world.stats['people.deaths'] = deaths;
      world.stats['people.alive'] = world.people.filter(
        (person) => person.deathWeek === null,
      ).length;
    },
  };
}
