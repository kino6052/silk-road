import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../testing/content.fixture';
import { demographyOf, generatePopulation, regionIncome } from './generate';
import type { Person } from './types';

const content = fixtureContent();
const population = generatePopulation(content, 42, 300);
const { people, households } = population;
const ageOf = (person: Person) => Math.floor(-person.birthWeek / 52);

describe('generation helpers', () => {
  it('fall back sensibly for countries without data', () => {
    const region = content.regions[0];
    expect(region && regionIncome(content, { ...region, country: 'ZZZ' })).toBe(0);
    expect(demographyOf(content, 'ZZZ').householdSize).toBeGreaterThan(1);
  });
});

describe('generatePopulation', () => {
  it('is deterministic for a seed and varies with it', () => {
    expect(generatePopulation(content, 42, 300)).toEqual(population);
    expect(generatePopulation(content, 43, 300).people[0]).not.toEqual(people[0]);
  });

  it('creates about the target number of people, in every region', () => {
    expect(people.length).toBeGreaterThanOrEqual(300);
    expect(people.length).toBeLessThan(345);
    for (const region of content.regions) {
      expect(people.filter((p) => p.region === region.id).length).toBeGreaterThanOrEqual(12);
    }
    people.forEach((person, index) => {
      expect(person.id).toBe(index);
    });
  });

  it('groups people into consistent households of one culture', () => {
    for (const household of households) {
      const members = household.members.map((id) => people[id]);
      expect(members.length).toBeGreaterThan(0);
      for (const member of members) {
        expect(member?.household).toBe(household.id);
        expect(member?.region).toBe(household.region);
        expect(member?.culture).toBe(members[0]?.culture);
      }
    }
    const sizes = households.map((h) => h.members.length);
    expect(Math.max(...sizes)).toBeGreaterThan(3);
  });

  it('draws cultures from the region and names from the culture, with gendered surnames', () => {
    expect(new Set(people.filter((p) => p.region === 'BBB-REST').map((p) => p.culture))).toEqual(
      new Set(['rus']),
    );
    for (const person of people) {
      const culture = content.cultures.find((c) => c.id === person.culture);
      const given = person.sex === 'f' ? culture?.givenNames.female : culture?.givenNames.male;
      expect(given).toContain(person.given);
      if (person.culture === 'rus' && person.sex === 'f') expect(person.family).toMatch(/a$/);
      if (person.culture === 'rus' && person.sex === 'm') expect(person.family).not.toMatch(/a$/);
    }
  });

  it('links spouses and parents within households', () => {
    const married = people.filter((p) => p.spouse !== null);
    expect(married.length).toBeGreaterThan(20);
    for (const person of married) {
      const spouse = people[person.spouse ?? -1];
      expect(spouse?.spouse).toBe(person.id);
      expect(spouse?.sex).not.toBe(person.sex);
    }
    const children = people.filter((p) => p.father !== null || p.mother !== null);
    expect(children.length).toBeGreaterThan(20);
    for (const child of children) {
      const parent = people[child.father ?? child.mother ?? -1];
      expect(ageOf(parent as Person) - ageOf(child)).toBeGreaterThanOrEqual(16);
    }
  });

  it('assigns roles that fit age, with story roles guaranteed where they belong', () => {
    for (const person of people) {
      const age = ageOf(person);
      expect(age).toBeGreaterThanOrEqual(0);
      if (age < 6) expect(person.role).toBe('child');
      else if (age < 18) expect(person.role).toBe('student');
      if (person.role === 'retiree') expect(age).toBeGreaterThanOrEqual(60);
    }
    const rolesIn = (region: string) =>
      people.filter((p) => p.region === region).map((p) => p.role);
    // AAA-ONE hosts a project and a city node; BBB-REST has a port and a project.
    expect(rolesIn('AAA-ONE')).toEqual(
      expect.arrayContaining(['construction-worker', 'local-official']),
    );
    expect(rolesIn('BBB-REST')).toEqual(
      expect.arrayContaining(['dockworker', 'construction-worker']),
    );
    expect(rolesIn('AAA-REST')).not.toContain('dockworker');
    expect(rolesIn('AAA-TWO')).toEqual(expect.arrayContaining(['customs-officer', 'truck-driver']));
  });

  it('gives earners an income and farming households land', () => {
    const earners = people.filter((p) => !['child', 'student', 'homemaker'].includes(p.role));
    expect(earners.every((p) => p.income > 0)).toBe(true);
    expect(people.filter((p) => p.role === 'child').every((p) => p.income === 0)).toBe(true);
    const farmers = people.filter((p) => p.role === 'farmer');
    expect(farmers.length).toBeGreaterThan(0);
    for (const farmer of farmers) expect(households[farmer.household]?.landHa).toBeGreaterThan(0);
    for (const person of people) {
      for (const value of Object.values(person.traits)) expect(value).toBeGreaterThanOrEqual(0);
      expect(person.education).toBeGreaterThanOrEqual(0);
      expect(person.education).toBeLessThanOrEqual(1);
    }
  });
});
