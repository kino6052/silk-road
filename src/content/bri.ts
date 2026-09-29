import type { BriEnvelope } from './types';

/**
 * The Belt and Road beyond the flagship projects listed individually: rounded estimates of
 * Chinese construction contracts and investment 2013–2023 (AEI China Global Investment
 * Tracker, AidData), loan shares and rates (AidData, Boston University), and the real income
 * gain from lower trade costs once the corridors work reliably (World Bank, "Belt and Road
 * Economics", 2019: about 1–3.4% for corridor economies, less for China and the EU).
 */
const SOURCE =
  'https://www.aei.org/china-global-investment-tracker/ ; https://www.aiddata.org/china-official-finance ; https://www.worldbank.org/en/topic/regional-integration/publication/belt-and-road-economics-opportunities-and-risks-of-transport-corridors';

const envelope = (
  country: string,
  totalBn: number,
  loanShare: number,
  rate: number,
  tradeGain: number,
): BriEnvelope => ({
  country,
  totalBn,
  loanShare,
  rate,
  tradeGain,
  provenance: 'estimated',
  source: SOURCE,
});

export const BRI_ENVELOPES: readonly BriEnvelope[] = [
  envelope('PAK', 55, 0.7, 0.035, 0.03),
  envelope('KAZ', 22, 0.5, 0.03, 0.03),
  envelope('UZB', 9, 0.7, 0.025, 0.03),
  envelope('RUS', 30, 0.4, 0.04, 0.01),
  envelope('BLR', 9, 0.8, 0.03, 0.02),
  envelope('EGY', 22, 0.6, 0.035, 0.02),
  envelope('IRN', 10, 0.5, 0.04, 0.02),
  envelope('TUR', 12, 0.4, 0.04, 0.01),
  envelope('AZE', 2, 0.3, 0.03, 0.02),
  envelope('GRC', 4, 0.1, 0.03, 0.01),
  envelope('POL', 2, 0.1, 0.03, 0.005),
  // Germany gains a little from the rail terminus at Duisburg; China from trade and contracts.
  envelope('DEU', 0, 0, 0, 0.002),
  envelope('CHN', 0, 0, 0, 0.004),
];
