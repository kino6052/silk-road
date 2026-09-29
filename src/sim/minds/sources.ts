import type { Person, SourceKind } from '../people/types';
import { HARMS, type TopicKind } from './topics';

export const SOURCES: readonly SourceKind[] = [
  'state-media',
  'independent-media',
  'social-media',
  'word-of-mouth',
  'employer',
  'own-eyes',
];

export interface Audience {
  readonly age: number;
  readonly pressFreedom: number;
  /** Urban share of the person's region. */
  readonly urban: number;
  readonly worksOnProject: boolean;
}

/** How much a person hears from each source (relative weights). */
export function exposure(person: Person, audience: Audience): Record<SourceKind, number> {
  const { age, pressFreedom, urban, worksOnProject } = audience;
  const { conformity, openness } = person.traits;
  return {
    'state-media': 0.4 + 0.3 * conformity * (1 - pressFreedom) + (age > 50 ? 0.3 : 0),
    'independent-media':
      pressFreedom * (0.3 + 0.5 * person.education) + 0.2 * openness * pressFreedom,
    'social-media': (age < 35 ? 0.7 : age < 55 ? 0.35 : 0.1) * (0.5 + 0.5 * urban),
    'word-of-mouth': 0.6,
    employer: worksOnProject ? 0.5 : 0,
    'own-eyes': 0.8,
  };
}

const VISIBLE: ReadonlySet<TopicKind> = new Set(['jobs', 'pollution', 'land', 'danger', 'china']);
const EMPLOYER_TOPICS: ReadonlySet<TopicKind> = new Set(['jobs', 'china', 'economy']);

/** Can this source say anything about the topic? */
export function covers(source: SourceKind, topic: TopicKind): boolean {
  if (source === 'own-eyes') return VISIBLE.has(topic);
  if (source === 'employer') return EMPLOYER_TOPICS.has(topic);
  return true;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * What a source reports, given the truth (0–1), before random noise. State media downplays
 * harm and talks up benefits in proportion to how unfree the press is; independent media
 * frames Chinese projects sceptically; social media amplifies alarm; employers talk up jobs.
 */
export function spin(
  source: SourceKind,
  topic: TopicKind,
  truth: number,
  pressFreedom: number,
): number {
  const harm = HARMS.has(topic);
  switch (source) {
    case 'state-media': {
      const control = 1 - pressFreedom;
      return clamp01(harm ? truth - 0.35 * control * truth : truth + 0.3 * control * (1 - truth));
    }
    case 'independent-media':
      return clamp01(topic === 'china' ? truth - 0.15 : truth);
    case 'social-media':
      return clamp01(harm ? truth + 0.15 * (1 - truth) : truth - 0.05);
    case 'employer':
      return clamp01(truth + 0.2 * (1 - truth));
    default:
      return truth;
  }
}

/** Random error in a source's message (spread of a uniform draw). */
export const NOISE: Readonly<Record<SourceKind, number>> = {
  'state-media': 0.1,
  'independent-media': 0.15,
  'social-media': 0.5,
  'word-of-mouth': 0.3,
  employer: 0.2,
  'own-eyes': 0.1,
};

/** How strongly a message moves a belief. */
export const PULL: Readonly<Record<SourceKind, number>> = {
  'state-media': 0.25,
  'independent-media': 0.3,
  'social-media': 0.35,
  'word-of-mouth': 0.3,
  employer: 0.3,
  'own-eyes': 0.5,
};
