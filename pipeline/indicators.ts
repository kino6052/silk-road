export interface IndicatorYear {
  readonly population: number | null;
  readonly gdp: number | null;
  readonly co2: number | null;
  readonly co2PerCapita: number | null;
  readonly coalCo2: number | null;
}
/** Country id → year → values. */
export type Indicators = Record<string, Record<string, IndicatorYear>>;

export function buildIndicators(_records: readonly Record<string, string>[]): Indicators {
  throw new Error('not implemented');
}
