import { dateToWeek } from '../../core/calendar';
import { required } from '../../core/required';
import type { Content, EventEffect, HistoricalEvent } from '../../content/types';
import type { System } from '../engine/engine';
import type { World } from '../world/world';

/** untilWeek for effects that stay in force until something else changes them. */
const PERMANENT = 1e9;
const SECURITY_EFFECT_WEEKS = 26;
const STABILITY_RECOVERY_PER_WEEK = 0.005;

/** How long a one-off effect stays active, in weeks; undefined = applied once to state. */
function durationOf(effect: EventEffect): number | undefined {
  switch (effect.kind) {
    case 'trade-shock':
    case 'route-disruption':
    case 'conflict':
    case 'pandemic':
      return effect.weeks;
    case 'disaster':
      return Math.round(8 + 20 * effect.severity);
    case 'security-attack':
      return SECURITY_EFFECT_WEEKS;
    case 'tariff':
      return PERMANENT;
    default:
      return undefined;
  }
}

function applyToState(world: World, effect: EventEffect): void {
  switch (effect.kind) {
    case 'sanctions': {
      const target = required(world.countries[effect.target], 'country');
      target.sanctions = Math.max(target.sanctions, effect.severity);
      return;
    }
    case 'sanctions-eased': {
      const target = required(world.countries[effect.target], 'country');
      target.sanctions /= 2;
      return;
    }
    case 'conflict': {
      const country = required(world.countries[effect.country], 'country');
      country.stability = Math.max(0, country.stability - effect.severity);
      return;
    }
    case 'bloc-join':
    case 'bloc-leave': {
      const country = required(world.countries[effect.country], 'country');
      country.blocs = country.blocs.filter((bloc) => bloc !== effect.bloc);
      if (effect.kind === 'bloc-join') country.blocs.push(effect.bloc);
      return;
    }
    case 'imf-program': {
      const country = required(world.countries[effect.country], 'country');
      country.imfProgram = true;
      country.externalDebt += effect.amountBn;
      return;
    }
    case 'debt-distress': {
      const country = required(world.countries[effect.country], 'country');
      country.debtDistress = Math.max(country.debtDistress, effect.severity);
      return;
    }
    case 'policy': {
      const actor = world.countries[effect.actor];
      if (actor) actor.policies.push(effect.policy);
      else world.stats[`timeline.policy.${effect.policy}`] = 1;
      return;
    }
    case 'bri-membership':
      world.stats[`timeline.briMember.${effect.country}`] = Number(effect.joined);
      return;
    default:
      return;
  }
}

function fire(world: World, event: HistoricalEvent): void {
  for (const effect of event.effects) {
    applyToState(world, effect);
    const weeks = durationOf(effect);
    if (weeks !== undefined) {
      world.effects.push({ source: event.id, effect, untilWeek: world.week + weeks });
    }
  }
  world.firedEvents.push(event.id);
}

/** Fires dated historical events and maintains time-limited effects and stability. */
export function createTimelineSystem(content: Content): System {
  const events = content.events.map((event) => ({ event, week: dateToWeek(event.date) }));
  return {
    id: 'timeline',
    step: (world) => {
      world.effects = world.effects.filter((active) => active.untilWeek > world.week);
      let fired = 0;
      for (const { event, week } of events) {
        if (week > world.week || (event.bri && !world.bri)) continue;
        if (world.firedEvents.includes(event.id)) continue;
        fire(world, event);
        fired++;
      }
      world.stats['timeline.fired'] = fired;
      const inConflict = new Set(
        world.effects.flatMap(({ effect }) => (effect.kind === 'conflict' ? [effect.country] : [])),
      );
      for (const country of Object.values(world.countries)) {
        if (inConflict.has(country.id)) continue;
        country.stability = Math.min(1, country.stability + STABILITY_RECOVERY_PER_WEEK);
      }
    },
  };
}
