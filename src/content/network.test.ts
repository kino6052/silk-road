import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { COUNTRIES } from './countries';
import { LINKS, NODES } from './network';
import { PROJECTS } from './projects';
import { REGIONS } from './regions';
import type { Mode, RouteLink, RouteNode } from './types';

const catalog: Record<string, string> = en;
const nodeById = new Map(NODES.map((node) => [node.id, node]));
const corridor = new Set(COUNTRIES.filter((c) => c.role === 'corridor').map((c) => c.id));
const regionCountry = new Map(REGIONS.map((region) => [region.id, region.country]));
const FREIGHT: readonly Mode[] = ['rail', 'road', 'sea'];
const inRussia = (node: RouteNode) => node.country === 'RUS';

// Node ids other content (events, scenarios) refers to.
const NODE_IDS = [
  ...['chongqing', 'chengdu', 'xian', 'yiwu', 'beijing', 'tianjin', 'shanghai', 'ningbo'],
  ...['guangzhou', 'xiamen', 'urumqi', 'kashgar', 'khorgos', 'alashankou', 'erenhot'],
  ...['manzhouli', 'dostyk', 'khorgos-gateway', 'almaty', 'astana', 'aktau', 'kuryk'],
  ...['tashkent', 'andijan', 'moscow', 'yekaterinburg', 'novosibirsk', 'zabaykalsk'],
  ...['st-petersburg', 'minsk', 'brest', 'malaszewicze', 'warsaw', 'lodz', 'duisburg'],
  ...['hamburg', 'baku-alat', 'kars', 'ankara', 'istanbul', 'mersin', 'tehran', 'mashhad'],
  ...['bandar-abbas', 'sarakhs', 'khunjerab', 'gilgit', 'islamabad', 'lahore', 'karachi'],
  ...['gwadar', 'cairo', 'ain-sokhna', 'port-said', 'suez-canal', 'piraeus', 'tbilisi'],
  ...['poti', 'ashgabat', 'ulaanbaatar', 'bishkek', 'singapore', 'malacca', 'colombo'],
  ...['djibouti', 'bab-el-mandeb', 'hormuz', 'bosporus', 'gibraltar', 'cape-of-good-hope'],
  ...['rotterdam', 'budapest'],
];

function nodeOf(id: string): RouteNode {
  const node = nodeById.get(id);
  if (node === undefined) throw new Error(`unknown node ${id}`);
  return node;
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;

function greatCircleKm(a: RouteNode, b: RouteNode): number {
  const h =
    Math.sin(radians(b.lat - a.lat) / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Breadth-first search over freight links (both directions), never entering `avoid` nodes. */
function reaches(
  from: string,
  to: string,
  links: readonly RouteLink[],
  avoid: (node: RouteNode) => boolean = () => false,
): boolean {
  const neighbours = new Map<string, string[]>();
  for (const link of links.filter((l) => FREIGHT.includes(l.mode))) {
    neighbours.set(link.from, [...(neighbours.get(link.from) ?? []), link.to]);
    neighbours.set(link.to, [...(neighbours.get(link.to) ?? []), link.from]);
  }
  const seen = new Set([from]);
  const queue = [from];
  for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
    if (current === to) return true;
    for (const next of neighbours.get(current) ?? []) {
      if (!seen.has(next) && !avoid(nodeOf(next))) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

describe('route nodes', () => {
  it('are exactly the referenced ids, each once', () => {
    expect(new Set(NODES.map((node) => node.id)).size).toBe(NODES.length);
    expect(NODES.map((node) => node.id).sort()).toEqual([...NODE_IDS].sort());
  });

  it('sit in a region of their own country on the corridor, and in no region elsewhere', () => {
    for (const node of NODES) {
      const regionOwner = node.region === null ? null : regionCountry.get(node.region);
      expect(regionOwner, node.id).toBe(corridor.has(node.country) ? node.country : null);
    }
  });

  it('have valid coordinates, a source and a display name', () => {
    for (const node of NODES) {
      expect(Math.abs(node.lat) <= 90 && Math.abs(node.lon) <= 180, node.id).toBe(true);
      expect(node.source, node.id).not.toBe('');
      expect(catalog[`node.${node.id}`], node.id).toBeTruthy();
    }
  });
});

describe('route links', () => {
  it('have unique ids of the form from~to~mode between known nodes', () => {
    expect(LINKS.length).toBeGreaterThanOrEqual(70);
    expect(new Set(LINKS.map((link) => link.id)).size).toBe(LINKS.length);
    for (const link of LINKS) {
      expect(link.id).toBe(`${link.from}~${link.to}~${link.mode}`);
      expect(nodeById.has(link.from) && nodeById.has(link.to), link.id).toBe(true);
      expect(link.from, link.id).not.toBe(link.to);
    }
  });

  it('are no shorter than the great circle and at most 3.5 times it', () => {
    for (const link of LINKS) {
      const direct = greatCircleKm(nodeOf(link.from), nodeOf(link.to));
      expect(link.km, link.id).toBeGreaterThanOrEqual(0.95 * direct);
      expect(link.km, link.id).toBeLessThanOrEqual(3.5 * direct);
    }
  });

  it('have positive capacity, non-negative handling time and a source', () => {
    for (const link of LINKS) {
      expect(link.capacity, link.id).toBeGreaterThan(0);
      expect(link.handlingHours, link.id).toBeGreaterThanOrEqual(0);
      expect(link.source, link.id).not.toBe('');
    }
  });

  it('carried China–Europe rail and Maritime Silk Road freight in September 2013', () => {
    const open = LINKS.filter((link) => link.open);
    expect(reaches('chongqing', 'duisburg', open)).toBe(true);
    expect(reaches('shanghai', 'piraeus', open)).toBe(true);
  });

  it('once every project is built, link Kashgar to Gwadar and Khorgos to Istanbul around Russia', () => {
    const open = LINKS.filter((link) => link.open);
    expect(reaches('kashgar', 'gwadar', LINKS)).toBe(true);
    expect(reaches('khorgos', 'istanbul', LINKS, inRussia)).toBe(true);
    expect(reaches('khorgos', 'istanbul', open, inRussia)).toBe(false);
  });

  it('start closed for the corridors built after 2013', () => {
    const closed = LINKS.filter((link) => !link.open).map((link) => link.id);
    expect(closed).toEqual(
      expect.arrayContaining([
        'tbilisi~kars~rail',
        'aktau~tehran~rail',
        'tashkent~andijan~rail',
        'zabaykalsk~beijing~pipeline',
      ]),
    );
  });

  it('start closed exactly when one project opens them', () => {
    const opened = PROJECTS.flatMap((project) => project.opensLinks);
    const closed = new Set(LINKS.filter((link) => !link.open).map((link) => link.id));
    for (const id of closed) expect(opened.filter((other) => other === id), id).toHaveLength(1);
    for (const id of opened) expect(closed.has(id), id).toBe(true);
  });
});
