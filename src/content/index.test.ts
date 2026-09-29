import { describe, expect, it } from 'vitest';
import { CONTENT } from './index';

describe('content bundle', () => {
  it('references only nodes, regions and countries that exist', () => {
    const nodes = new Set(CONTENT.nodes.map((node) => node.id));
    const regions = new Set(CONTENT.regions.map((region) => region.id));
    for (const event of CONTENT.events) {
      for (const effect of event.effects) {
        if ('node' in effect) expect(nodes, event.id).toContain(effect.node);
        if ('region' in effect) expect(regions, event.id).toContain(effect.region);
      }
    }
    for (const project of CONTENT.projects) expect(regions, project.id).toContain(project.region);
  });

  it('has 2013 indicators for every country that has regions', () => {
    for (const region of CONTENT.regions) {
      expect(CONTENT.indicators[region.country]?.['2013']?.gdp, region.id).toBeGreaterThan(0);
    }
  });
});
