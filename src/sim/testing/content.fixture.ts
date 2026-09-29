// A tiny, hand-made world for unit tests: two corridor countries, one external power.
import type { Content, Country, Culture, Demography, Region } from '../../content/types';

const sourced = { provenance: 'estimated', source: 'test fixture' } as const;

const country = (id: string, role: Country['role'], extra: Partial<Country> = {}): Country => ({
  id,
  role,
  regime: 'hybrid',
  pressFreedom: 0.5,
  corruption: 0.5,
  blocs: [],
  pm25: 20,
  externalDebtBn: 10,
  growthTrend: 0.03,
  sanctions: 0,
  ...sourced,
  ...extra,
});

const region = (id: string, extra: Partial<Region> = {}): Region => ({
  id,
  country: id.slice(0, 3),
  lat: 40,
  lon: 70,
  population: 2,
  urban: 0.5,
  income: 1,
  climate: 'continental',
  groups: { han: 1 },
  employment: { agriculture: 0.2, industry: 0.3, services: 0.5 },
  ...sourced,
  ...extra,
});

const culture = (id: string, gendered: boolean): Culture => ({
  id,
  language: 'xx',
  religion: 'folk-none',
  festivals: [],
  nameOrder: 'given-first',
  givenNames: {
    female: ['Ana', 'Bea', 'Cai', 'Dua', 'Eli'],
    male: ['Arn', 'Bo', 'Cid', 'Dan', 'Ed'],
  },
  familyNames: ['Ivanov', 'Petrov', 'Sidorov', 'Orlov', 'Popov'],
  ...(gendered
    ? { familyNamesFemale: ['Ivanova', 'Petrova', 'Sidorova', 'Orlova', 'Popova'] }
    : {}),
});

const demography: Demography = {
  householdSize: 4,
  homemakerShare: 0.3,
  retirementAge: 60,
  education: 0.6,
  fertility: 2.5,
  lifeExpectancy: 72,
};

export const fixtureContent = (): Content => ({
  countries: [
    country('AAA', 'corridor', { blocs: ['SCO'] }),
    country('BBB', 'corridor'),
    country('ZZZ', 'external'),
  ],
  regions: [
    region('AAA-ONE', { urban: 1, income: 2 }),
    region('AAA-REST', { groups: { han: 0.5, rus: 0.5 } }),
    region('AAA-TWO', { income: 0.5, population: 0.5 }),
    region('BBB-REST', { groups: { rus: 1 } }),
  ],
  cultures: [culture('han', false), culture('rus', true)],
  nodes: [
    { id: 'a', kind: 'city', country: 'AAA', region: 'AAA-ONE', lat: 40, lon: 70, ...sourced },
    { id: 'b', kind: 'port', country: 'BBB', region: 'BBB-REST', lat: 41, lon: 72, ...sourced },
    { id: 'c', kind: 'border', country: 'AAA', region: 'AAA-TWO', lat: 42, lon: 71, ...sourced },
  ],
  links: [
    {
      id: 'a~b~rail',
      from: 'a',
      to: 'b',
      mode: 'rail',
      km: 200,
      open: false,
      capacity: 1,
      handlingHours: 6,
      ...sourced,
    },
    {
      id: 'a~b~road',
      from: 'a',
      to: 'b',
      mode: 'road',
      km: 210,
      open: true,
      capacity: 0.5,
      handlingHours: 2,
      ...sourced,
    },
  ],
  projects: [
    {
      id: 'rail-ab',
      kind: 'rail',
      country: 'AAA',
      region: 'AAA-ONE',
      bri: true,
      sponsor: 'CHN',
      lenders: ['china-exim'],
      costBn: 2,
      loanBn: 1.5,
      interestRate: 0.02,
      announced: { year: 2013, month: 10, day: 1 },
      constructionStart: { year: 2014, month: 1, day: 6 },
      opened: { year: 2015, month: 1, day: 5 },
      jobs: { construction: 5000, operation: 500, localShare: 0.7 },
      co2KtPerYear: 0,
      landHa: 300,
      displacedPeople: 1000,
      opensLinks: ['a~b~rail'],
      ...sourced,
    },
    {
      id: 'port-b',
      kind: 'port',
      country: 'BBB',
      region: 'BBB-REST',
      bri: false,
      sponsor: 'BBB',
      lenders: [],
      costBn: 1,
      loanBn: 0,
      interestRate: 0,
      announced: { year: 2013, month: 9, day: 2 },
      constructionStart: { year: 2013, month: 9, day: 2 },
      jobs: { construction: 2000, operation: 300, localShare: 1 },
      co2KtPerYear: 50,
      landHa: 100,
      displacedPeople: 0,
      opensLinks: [],
      ...sourced,
    },
  ],
  events: [],
  demography: {
    AAA: { ...demography, householdSize: 3 },
    BBB: { ...demography, householdSize: 6, retirementAge: 65 },
  },
  indicators: {
    AAA: { 2013: { population: 5e6, gdp: 50e9, co2: 30, co2PerCapita: 6, coalCo2: 10 } },
    BBB: { 2013: { population: 2e6, gdp: 10e9, co2: null, co2PerCapita: null, coalCo2: null } },
    ZZZ: {},
  },
});
