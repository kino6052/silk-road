// Trade model parameters: origin–destination demand, link costs and the time path of
// China–Europe rail competitiveness. All values are modelling estimates (provenance
// 'estimated'), calibrated so the BRI world roughly reproduces China–Europe train counts
// (China State Railway Group: ~80 trips in 2013, ~1,700 in 2016, ~6,300 in 2018,
// ~12,400 in 2020, ~15,000 in 2021, ~16,500 in 2022, ~17,500 in 2023).
import type { Sourced } from '../../../content/types';
import { exp, pow } from '../../../core/fixed-math';

/** Fractional calendar year at sim week 0 (Monday 2 September 2013). */
export const START_YEAR = 2013 + 244 / 365;

export const yearOfWeek = (week: number): number => START_YEAR + (week * 7) / 365.25;

/**
 * 'europe': China–Europe Railway Express markets, which (as in China Railway's statistics)
 *   include Russia and Belarus; their rail TEU are counted as China–Europe trains;
 * 'eurasia': other long-haul block-train markets opened up by the BRI (Iran, Turkey, Caucasus);
 * 'other': neighbour rail markets with mature services (Central Asia, Pakistan), and
 *   maritime markets.
 * 'europe' and 'eurasia' rail pays the service gap and receives the rail subsidy.
 */
export type Market = 'europe' | 'eurasia' | 'other';

export interface OriginDestination {
  readonly from: string;
  readonly to: string;
  /** Two-way container volume in 2013, TEU per week. */
  readonly teu: number;
  readonly market: Market;
}

const od = (from: string, to: string, teu: number, market: Market): OriginDestination => ({
  from,
  to,
  teu,
  market,
});

export const OD_SOURCE: Sourced = {
  provenance: 'estimated',
  source:
    'Scaled from Asia–Europe liner volumes (Drewry, UNCTAD Review of Maritime Transport 2014) ' +
    'and China customs trade shares by partner, 2013; split across representative city pairs.',
};

/** Weekly two-way container demand between Chinese origins and corridor destinations, 2013. */
export const OD_TABLE: readonly OriginDestination[] = [
  od('chongqing', 'duisburg', 5000, 'europe'),
  od('chengdu', 'lodz', 3000, 'europe'),
  od('xian', 'hamburg', 4000, 'europe'),
  od('yiwu', 'duisburg', 6000, 'europe'),
  od('yiwu', 'warsaw', 3000, 'europe'),
  od('shanghai', 'hamburg', 40000, 'europe'),
  od('shanghai', 'duisburg', 25000, 'europe'),
  od('shanghai', 'lodz', 5000, 'europe'),
  od('ningbo', 'hamburg', 20000, 'europe'),
  od('ningbo', 'duisburg', 12000, 'europe'),
  od('guangzhou', 'hamburg', 20000, 'europe'),
  od('guangzhou', 'duisburg', 10000, 'europe'),
  od('xiamen', 'hamburg', 8000, 'europe'),
  od('tianjin', 'hamburg', 10000, 'europe'),
  od('tianjin', 'malaszewicze', 4000, 'europe'),
  od('tianjin', 'moscow', 3000, 'europe'),
  od('chongqing', 'moscow', 1500, 'europe'),
  od('yiwu', 'moscow', 1500, 'europe'),
  od('shanghai', 'moscow', 4000, 'europe'),
  od('guangzhou', 'moscow', 2000, 'europe'),
  od('xian', 'minsk', 500, 'europe'),
  od('xian', 'almaty', 3000, 'other'),
  od('shanghai', 'almaty', 2000, 'other'),
  od('tianjin', 'almaty', 1500, 'other'),
  od('yiwu', 'tashkent', 1500, 'other'),
  od('xian', 'tashkent', 1000, 'other'),
  od('yiwu', 'tehran', 1500, 'eurasia'),
  od('shanghai', 'tehran', 3000, 'eurasia'),
  od('guangzhou', 'tehran', 1500, 'eurasia'),
  od('xian', 'istanbul', 1000, 'eurasia'),
  od('shanghai', 'istanbul', 8000, 'eurasia'),
  od('ningbo', 'istanbul', 4000, 'eurasia'),
  od('xian', 'baku-alat', 300, 'eurasia'),
  od('shanghai', 'piraeus', 10000, 'other'),
  od('ningbo', 'piraeus', 6000, 'other'),
  od('xiamen', 'piraeus', 2000, 'other'),
  od('shanghai', 'port-said', 4000, 'other'),
  od('ningbo', 'cairo', 2500, 'other'),
  od('shanghai', 'karachi', 5000, 'other'),
  od('guangzhou', 'karachi', 3000, 'other'),
  od('xian', 'karachi', 300, 'other'),
  od('shanghai', 'gwadar', 200, 'other'),
];

/** How a link is costed. Caspian sea links are rail ferries and belong to the land mode. */
export type LinkKind = 'rail' | 'road' | 'sea' | 'ferry';

export interface LinkCost {
  /** Freight rate, USD per TEU-km. */
  readonly usdPerKm: number;
  /** Average commercial speed including stops, km/h. */
  readonly kmh: number;
  /** TEU per week carried by one unit of content capacity. */
  readonly teuPerCapacity: number;
}

export const LINK_COST: Readonly<Record<LinkKind, LinkCost>> = {
  rail: { usdPerKm: 0.4, kmh: 35, teuPerCapacity: 22_000 },
  road: { usdPerKm: 1, kmh: 50, teuPerCapacity: 10_000 },
  sea: { usdPerKm: 0.05, kmh: 30, teuPerCapacity: 1_000_000 },
  ferry: { usdPerKm: 1, kmh: 15, teuPerCapacity: 10_000 },
};

/** Caspian ports; sea links between them are rail ferries of the Middle Corridor. */
export const CASPIAN_PORTS: ReadonlySet<string> = new Set([
  'aktau',
  'kuryk',
  'baku-alat',
  'turkmenbashi',
]);

export const NORTHERN_COUNTRY = 'RUS';
export const MIDDLE_CORRIDOR_NODE = 'baku-alat';
export const SUEZ_NODE = 'suez-canal';
export const CAPE_NODE = 'cape-of-good-hope';

export const TRADE_PARAMS = {
  /** Shippers' value of transit time, USD per TEU-hour (high-value rail-borne cargo). */
  valueOfTimeUsd: 4,
  /** Logit scale on generalised cost differences, per USD per TEU. */
  logitPerUsd: 0.001,
  /** TEU per China–Europe block train (41–45 wagons of two TEU). */
  teuPerTrain: 90,
  /** Real growth of container demand per year. */
  demandGrowth: 0.03,
  /** Transit penalty through a sanctioned country at severity 1, USD per TEU-km. */
  sanctionUsdPerKm: 0.04,
  /** Penalty for crossing a sanctioned border at severity 1, USD per TEU. */
  sanctionUsdPerBorder: 250,
  /** Share of demand to or from a country lost at sanctions severity 1. */
  sanctionDemandCut: 0.15,
  /** War-risk surcharge per link touching a disrupted node, × (1 − factor), USD per TEU. */
  disruptionRiskUsd: 1000,
  /** Congestion cost at volume = capacity, USD per TEU (grows with the 4th power). */
  congestionUsd: 400,
  /** Incremental assignment: demand is loaded in this many equal slices. */
  loadingSlices: 4,
  /** Routes are searched again only once congestion moved a link cost by more, USD per TEU. */
  rerouteUsd: 5,
  /**
   * China's rail freight subsidy on long-haul block trains (BRI world only), USD per TEU.
   * Central caps from 2021 phase it down; local support tapers until 2028.
   */
  subsidy: { usd: 500, from: 2014, phaseDownFrom: 2021, phaseDownTo: 2028 },
  /**
   * Service gap of new long-haul rail markets: logit penalty for missing schedules,
   * customs coordination and shipper trust. It closes by `rate` per year from 2013.
   */
  serviceGap: { initial: 6.2, briRate: 0.2, shadowRate: 0.08 },
} as const;

export function railSubsidyUsd(bri: boolean, year: number): number {
  const { usd, from, phaseDownFrom, phaseDownTo } = TRADE_PARAMS.subsidy;
  if (!bri || year < from) return 0;
  const phaseDown = (year - phaseDownFrom) / (phaseDownTo - phaseDownFrom);
  return usd * Math.min(1, Math.max(0, 1 - phaseDown));
}

export function serviceGap(bri: boolean, year: number): number {
  const { initial, briRate, shadowRate } = TRADE_PARAMS.serviceGap;
  return initial * exp(-(bri ? briRate : shadowRate) * Math.max(0, year - START_YEAR));
}

export const demandTrend = (year: number): number =>
  pow(1 + TRADE_PARAMS.demandGrowth, year - START_YEAR);
