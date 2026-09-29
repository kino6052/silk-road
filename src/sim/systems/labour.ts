import type { Content, Project } from '../../content/types';
import type { System } from '../engine/engine';
import type { Jobs, ProjectStatus } from '../world/state';

export const LOGISTICS_JOBS_PER_WEEKLY_TEU = 0.2;
export const MIN_UNEMPLOYMENT = 0.01;
export const MAX_UNEMPLOYMENT = 0.6;
export const MAX_MIGRATION_RATE = 0.002;
export const DISASTER_DISPLACED_SHARE = 0.03;

export interface Workforce {
  readonly sector: keyof Jobs;
  readonly local: number;
  readonly foreign: number;
}

export function projectWorkforce(project: Project, status: ProjectStatus): Workforce {
  throw new Error(`not implemented: ${project.id} ${status}`);
}

export function createLabourSystem(content: Content): System {
  throw new Error(`not implemented: ${String(content.regions.length)}`);
}
