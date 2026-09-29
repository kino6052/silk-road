import { describe, expect, it } from 'vitest';
import { civilFromDays, daysFromCivil } from '../core/calendar';
import { en } from '../i18n/en';
import { COUNTRIES } from './countries';
import { LINKS } from './network';
import { PROJECTS } from './projects';
import { REGIONS } from './regions';

const catalog: Record<string, string> = en;
const regionCountry = new Map(REGIONS.map((region) => [region.id, region.country]));
const corridor = new Set(COUNTRIES.filter((c) => c.role === 'corridor').map((c) => c.id));
const linkIds = new Set(LINKS.map((link) => link.id));
const within = (value: number, low: number, high: number) => value >= low && value <= high;
const bri = (id: string) => PROJECTS.find((project) => project.id === id)?.bri;

describe('projects', () => {
  it('are 15 or more flagship projects with unique ids', () => {
    expect(PROJECTS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(PROJECTS.map((project) => project.id)).size).toBe(PROJECTS.length);
  });

  it('sit in a region of their own corridor country', () => {
    for (const project of PROJECTS) {
      expect(corridor.has(project.country), project.id).toBe(true);
      expect(regionCountry.get(project.region), project.id).toBe(project.country);
    }
  });

  it('have real calendar dates: announced, then construction, then opening', () => {
    for (const project of PROJECTS) {
      const opened = project.opened ?? project.constructionStart;
      for (const date of [project.announced, project.constructionStart, opened]) {
        expect(civilFromDays(daysFromCivil(date)), project.id).toEqual(date);
      }
      expect(daysFromCivil(project.announced), project.id).toBeLessThanOrEqual(
        daysFromCivil(project.constructionStart),
      );
      expect(daysFromCivil(project.constructionStart), project.id).toBeLessThanOrEqual(
        daysFromCivil(opened),
      );
    }
  });

  it('borrow no more than they cost, from named lenders, at plausible rates', () => {
    for (const project of PROJECTS) {
      expect(project.costBn, project.id).toBeGreaterThan(0);
      expect(within(project.loanBn, 0, project.costBn), project.id).toBe(true);
      expect(within(project.interestRate, 0, 0.1), project.id).toBe(true);
      expect(project.lenders.length > 0, project.id).toBe(project.loanBn > 0);
    }
  });

  it('have plausible jobs and footprints', () => {
    for (const project of PROJECTS) {
      const { construction, operation, localShare } = project.jobs;
      expect(construction >= 0 && operation >= 0, project.id).toBe(true);
      expect(within(localShare, 0, 1), project.id).toBe(true);
      expect(project.co2KtPerYear >= 0 && project.landHa >= 0, project.id).toBe(true);
      expect(Number.isInteger(project.displacedPeople), project.id).toBe(true);
      expect(project.displacedPeople, project.id).toBeGreaterThanOrEqual(0);
    }
  });

  it('open only known route links', () => {
    for (const project of PROJECTS) {
      for (const id of project.opensLinks) expect(linkIds.has(id), project.id).toBe(true);
    }
  });

  it('have a name, a summary and a source', () => {
    for (const project of PROJECTS) {
      expect(catalog[`project.${project.id}`], project.id).toBeTruthy();
      expect(catalog[`project.${project.id}.summary`], project.id).toBeTruthy();
      expect(project.source, project.id).not.toBe('');
    }
  });

  it('count only Chinese-backed projects as Belt and Road', () => {
    expect(bri('angren-pap-railway')).toBe(true);
    expect(bri('gwadar-port')).toBe(true);
    expect(bri('piraeus-cosco')).toBe(true);
    expect(bri('baku-tbilisi-kars-railway')).toBe(false);
    expect(bri('kti-railway')).toBe(false);
    expect(bri('baku-alat-port')).toBe(false);
    expect(bri('power-of-siberia')).toBe(false);
  });
});
