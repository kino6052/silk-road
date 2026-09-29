import { dateToWeek } from '../../core/calendar';
import type { Content, Project } from '../../content/types';
import type { System } from '../engine/engine';
import type { ProjectStatus } from '../world/state';

/** Years of construction without a historical opening date before a project counts as stalled. */
const STALL_YEARS = 6;

interface Schedule {
  readonly announced: number;
  readonly start: number;
  /** Week it opens, or the week it stalls when it never opened historically. */
  readonly end: number;
  readonly endStatus: ProjectStatus;
}

const scheduleOf = (project: Project): Schedule => {
  const start = project.constructionStart;
  return {
    announced: dateToWeek(project.announced),
    start: dateToWeek(start),
    end: dateToWeek(project.opened ?? { ...start, year: start.year + STALL_YEARS }),
    endStatus: project.opened ? 'operating' : 'stalled',
  };
};

const statusAt = (week: number, schedule: Schedule): ProjectStatus => {
  if (week >= schedule.end) return schedule.endStatus;
  if (week >= schedule.start) return 'construction';
  return week >= schedule.announced ? 'planned' : 'hidden';
};

/** Moves projects through their historical lifecycle and opens the links they build. */
export function createProjectsSystem(content: Content): System {
  const projects = content.projects.map((project) => ({ project, schedule: scheduleOf(project) }));
  return {
    id: 'projects',
    step: (world) => {
      const counts: Partial<Record<ProjectStatus, number>> = {};
      for (const { project, schedule } of projects) {
        const state = world.projects[project.id];
        if (!state) continue;
        state.status = statusAt(world.week, schedule);
        counts[state.status] = (counts[state.status] ?? 0) + 1;
        if (state.status !== 'operating') continue;
        for (const linkId of project.opensLinks) {
          const link = world.links[linkId];
          if (link) link.open = true;
        }
      }
      world.stats['projects.construction'] = counts.construction ?? 0;
      world.stats['projects.operating'] = counts.operating ?? 0;
    },
  };
}
