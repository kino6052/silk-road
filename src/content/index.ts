import { COUNTRIES } from './countries';
import { CULTURES } from './cultures';
import { DEMOGRAPHY } from './demography';
import { EVENTS } from './events';
import indicators from './generated/indicators.json';
import { LINKS, NODES } from './network';
import { PROJECTS } from './projects';
import { REGIONS } from './regions';
import type { Content } from './types';

/** All static content the game is built from. */
export const CONTENT: Content = {
  countries: COUNTRIES,
  regions: REGIONS,
  cultures: CULTURES,
  nodes: NODES,
  links: LINKS,
  projects: PROJECTS,
  events: EVENTS,
  indicators: indicators,
  demography: DEMOGRAPHY,
};
