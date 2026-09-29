import { required } from '../../core/required';
import type { Content } from '../../content/types';
import { LABOUR_PARTICIPATION, type World } from '../world/world';

export type TopicKind =
  'jobs' | 'pollution' | 'land' | 'danger' | 'debt' | 'economy' | 'sanctions' | 'china';

/** Topics about a person's region; the rest are about their country. */
export const REGIONAL_TOPICS: readonly TopicKind[] = [
  'jobs',
  'pollution',
  'land',
  'danger',
  'china',
];
export const NATIONAL_TOPICS: readonly TopicKind[] = ['debt', 'economy', 'sanctions'];

/** Topics where a higher value means harm (the rest mean benefit). */
export const HARMS: ReadonlySet<TopicKind> = new Set([
  'pollution',
  'land',
  'danger',
  'debt',
  'sanctions',
]);

export const topicId = (kind: TopicKind, scope: string): string => `${kind}:${scope}`;
export const topicKind = (topic: string): TopicKind => topic.split(':')[0] as TopicKind;

export function topicsFor(region: string, country: string): string[] {
  return [
    ...REGIONAL_TOPICS.map((kind) => topicId(kind, region)),
    ...NATIONAL_TOPICS.map((kind) => topicId(kind, country)),
  ];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The actual state of every topic in this world, each 0–1:
 * jobs = new project and logistics jobs are appearing; pollution = the air is bad;
 * land = land is being taken; danger = it is unsafe; debt = the country is over-indebted;
 * economy = the economy is growing; sanctions = the country is cut off;
 * china = Chinese-backed projects here are helping (0.5 where there are none).
 */
export function truths(world: World, content: Content): Map<string, number> {
  const truth = new Map<string, number>();
  const briProjects = content.projects.filter((project) => project.bri);
  for (const region of Object.values(world.regions)) {
    const labour = region.population * LABOUR_PARTICIPATION;
    const jobs = clamp01(((region.jobs.construction + region.jobs.logistics) / labour) * 20);
    const pollution = clamp01(region.pollution / 100);
    const land = clamp01((region.displaced / region.population) * 1000);
    const active = briProjects.some((project) => {
      const status = world.projects[project.id]?.status;
      return project.region === region.id && (status === 'construction' || status === 'operating');
    });
    truth.set(topicId('jobs', region.id), jobs);
    truth.set(topicId('pollution', region.id), pollution);
    truth.set(topicId('land', region.id), land);
    truth.set(topicId('danger', region.id), clamp01(1 - region.security));
    truth.set(
      topicId('china', region.id),
      active ? clamp01(0.5 + 0.5 * jobs - 0.3 * land - 0.2 * pollution) : 0.5,
    );
  }
  for (const country of Object.values(world.countries)) {
    const growth = world.stats[`economy.gdpGrowth.${country.id}`] ?? 0;
    truth.set(topicId('debt', country.id), country.debtDistress);
    truth.set(topicId('economy', country.id), clamp01(0.5 + growth * 10));
    truth.set(topicId('sanctions', country.id), country.sanctions);
  }
  return truth;
}

/** A belief's value, or the uninformed 0.5. */
export const believed = (
  beliefs: Readonly<Record<string, { readonly value: number }>>,
  topic: string,
): number => beliefs[topic]?.value ?? 0.5;

export const truthOf = (truth: Map<string, number>, topic: string): number =>
  required(truth.get(topic), `truth for ${topic}`);
