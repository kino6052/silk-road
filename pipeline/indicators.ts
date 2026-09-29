import type { IndicatorYear } from '../src/content/types.ts';

type MutableIndicators = Record<string, Record<string, IndicatorYear>>;

const EU_AGGREGATE = 'European Union (27)';

const toNumber = (value: string | undefined, label: string): number | null => {
  if (value === undefined || value === '') return null;
  const number = Number(value);
  if (Number.isNaN(number)) throw new Error(`${label}: not a number: ${value}`);
  return number;
};

/** Turns trimmed OWID CO2-dataset records into per-country, per-year indicators. */
export function buildIndicators(records: readonly Record<string, string>[]): MutableIndicators {
  const indicators: MutableIndicators = {};
  for (const record of records) {
    const id = record.country === EU_AGGREGATE ? 'EU' : record.iso_code;
    const label = `${String(record.country)} ${String(record.year)}`;
    if (!id) throw new Error(`${label}: no country id`);
    const byYear = (indicators[id] ??= {});
    byYear[String(record.year)] = {
      population: toNumber(record.population, label),
      gdp: toNumber(record.gdp, label),
      co2: toNumber(record.co2, label),
      co2PerCapita: toNumber(record.co2_per_capita, label),
      coalCo2: toNumber(record.coal_co2, label),
    };
  }
  return indicators;
}
