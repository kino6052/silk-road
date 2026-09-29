import { required } from '../../core/required';
import type { Content } from '../../content/types';
import type { System } from '../engine/engine';
import { ageAt, isDue } from '../people/lifecycle';
import { pickWeighted } from '../people/roles';
import type { Person, Role } from '../people/types';
import type { Rng } from '../../core/rng';
import type { World } from '../world/world';
import { covers, exposure, NOISE, PULL, SOURCES, spin } from './sources';
import { topicKind, topicsFor, truthOf, truths } from './topics';

/** People younger than this don't form beliefs about public affairs. */
export const BELIEF_AGE = 12;

/** Roles whose employer talks to them about projects and the economy. */
const PROJECT_ROLES: ReadonlySet<Role> = new Set([
  'construction-worker',
  'engineer',
  'dockworker',
  'rail-worker',
  'truck-driver',
  'port-manager',
]);

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Monthly: each person hears about each of their topics from one source and updates. */
export function createBeliefsSystem(content: Content): System {
  const pressFreedom = new Map(content.countries.map((c) => [c.id, c.pressFreedom]));
  const urban = new Map(content.regions.map((r) => [r.id, r.urban]));
  const listen = (world: World, person: Person, truth: Map<string, number>, rng: Rng) => {
    const age = ageAt(person, world.week);
    if (age < BELIEF_AGE) return;
    const country = required(world.regions[person.region], 'region state').country;
    const freedom = required(pressFreedom.get(country), 'press freedom');
    const weights = exposure(person, {
      age,
      pressFreedom: freedom,
      urban: required(urban.get(person.region), 'urban share'),
      worksOnProject: PROJECT_ROLES.has(person.role),
    });
    for (const topic of topicsFor(person.region, country)) {
      const kind = topicKind(topic);
      const source = pickWeighted(
        rng,
        SOURCES.filter((s) => covers(s, kind) && weights[s] > 0).map(
          (s) => [s, weights[s]] as const,
        ),
      );
      const message = clamp(
        spin(source, kind, truthOf(truth, topic), freedom) + (rng.float() - 0.5) * NOISE[source],
        0,
        1,
      );
      const prior = person.beliefs[topic] ?? { value: 0.5, confidence: 0.2 };
      const rate = PULL[source] * (1 - 0.5 * prior.confidence);
      const agrees = Math.abs(message - prior.value) < 0.15;
      person.beliefs[topic] = {
        value: prior.value + rate * (message - prior.value),
        confidence: clamp(prior.confidence + (agrees ? 0.1 : -0.05), 0.1, 1),
        source,
        since: world.week,
      };
    }
  };
  return {
    id: 'beliefs',
    prime: (world, ctx) => {
      const truth = truths(world, content);
      for (const person of world.people) {
        if (person.deathWeek === null) listen(world, person, truth, ctx.rng(person.id, 'prime'));
      }
    },
    step: (world, ctx) => {
      const truth = truths(world, content);
      for (const person of world.people) {
        if (person.deathWeek !== null || !isDue(person, world.week)) continue;
        listen(world, person, truth, ctx.rng(person.id));
      }
    },
  };
}
