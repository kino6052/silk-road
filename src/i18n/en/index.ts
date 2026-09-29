import countries from './countries.json';
import cultures from './cultures.json';
import events from './events.json';
import network from './network.json';
import projects from './projects.json';
import regions from './regions.json';
import ui from './ui.json';
import type { Catalog } from '../t';

/** English catalog, split into one file per content area to keep edits independent. */
export const en: Catalog = {
  ...countries,
  ...regions,
  ...cultures,
  ...network,
  ...projects,
  ...events,
  ...ui,
};
