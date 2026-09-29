import type { Mode, NodeKind, RouteLink, RouteNode } from './types';

const wiki = (...pages: string[]) =>
  pages.map((page) => `https://en.wikipedia.org/wiki/${page}`).join(' ; ');

const node = (
  id: string,
  kind: NodeKind,
  country: string,
  region: string | null,
  lat: number,
  lon: number,
  page: string,
): RouteNode => ({
  id,
  kind,
  country,
  region,
  lat,
  lon,
  provenance: 'historical',
  source: wiki(page),
});

export const NODES: readonly RouteNode[] = [
  // China
  node('chongqing', 'city', 'CHN', 'CHN-CQ', 29.56, 106.55, 'Chongqing'),
  node('chengdu', 'city', 'CHN', 'CHN-CQ', 30.66, 104.07, 'Chengdu'),
  node('xian', 'city', 'CHN', 'CHN-REST', 34.34, 108.94, 'Xi%27an'),
  node('yiwu', 'city', 'CHN', 'CHN-ZJ', 29.31, 120.07, 'Yiwu'),
  node('beijing', 'city', 'CHN', 'CHN-BJ', 39.9, 116.4, 'Beijing'),
  node('tianjin', 'port', 'CHN', 'CHN-BJ', 38.97, 117.78, 'Port_of_Tianjin'),
  node('shanghai', 'port', 'CHN', 'CHN-REST', 31.23, 121.47, 'Port_of_Shanghai'),
  node('ningbo', 'port', 'CHN', 'CHN-ZJ', 29.87, 121.55, 'Port_of_Ningbo-Zhoushan'),
  node('guangzhou', 'port', 'CHN', 'CHN-GD', 23.13, 113.26, 'Port_of_Guangzhou'),
  node('xiamen', 'port', 'CHN', 'CHN-FJ', 24.48, 118.09, 'Port_of_Xiamen'),
  node('urumqi', 'city', 'CHN', 'CHN-XJ', 43.83, 87.62, 'Ürümqi'),
  node('kashgar', 'city', 'CHN', 'CHN-XJ', 39.47, 75.99, 'Kashgar'),
  node('khorgos', 'border', 'CHN', 'CHN-XJ', 44.21, 80.42, 'Khorgas'),
  node('alashankou', 'border', 'CHN', 'CHN-XJ', 45.17, 82.57, 'Alashankou'),
  node('erenhot', 'border', 'CHN', 'CHN-REST', 43.65, 111.98, 'Erenhot'),
  node('manzhouli', 'border', 'CHN', 'CHN-REST', 49.58, 117.43, 'Manzhouli'),
  // Kazakhstan
  node('dostyk', 'border', 'KAZ', 'KAZ-ALA', 45.25, 82.48, 'Dostyk'),
  node('khorgos-gateway', 'dry-port', 'KAZ', 'KAZ-ALA', 44.18, 80.33, 'Khorgos_Gateway'),
  node('almaty', 'city', 'KAZ', 'KAZ-ALA', 43.24, 76.89, 'Almaty'),
  node('astana', 'city', 'KAZ', 'KAZ-AST', 51.17, 71.45, 'Astana'),
  node('aktau', 'port', 'KAZ', 'KAZ-AKT', 43.65, 51.17, 'Port_of_Aktau'),
  node('kuryk', 'port', 'KAZ', 'KAZ-AKT', 43.17, 51.65, 'Kuryk'),
  // Uzbekistan
  node('tashkent', 'city', 'UZB', 'UZB-TAS', 41.3, 69.24, 'Tashkent'),
  node('andijan', 'city', 'UZB', 'UZB-FER', 40.78, 72.34, 'Andijan'),
  // Russia
  node('moscow', 'city', 'RUS', 'RUS-MOW', 55.76, 37.62, 'Moscow'),
  node('yekaterinburg', 'city', 'RUS', 'RUS-REST', 56.84, 60.61, 'Yekaterinburg'),
  node('novosibirsk', 'city', 'RUS', 'RUS-SIB', 55.03, 82.92, 'Novosibirsk'),
  node('zabaykalsk', 'border', 'RUS', 'RUS-SIB', 49.65, 117.32, 'Zabaykalsk'),
  node('st-petersburg', 'port', 'RUS', 'RUS-REST', 59.93, 30.34, 'Port_of_Saint_Petersburg'),
  // Belarus
  node('minsk', 'city', 'BLR', 'BLR-MSQ', 53.9, 27.57, 'Minsk'),
  node('brest', 'border', 'BLR', 'BLR-REST', 52.1, 23.73, 'Brest,_Belarus'),
  // Poland
  node('malaszewicze', 'dry-port', 'POL', 'POL-MAL', 52.03, 23.53, 'Małaszewicze'),
  node('warsaw', 'city', 'POL', 'POL-REST', 52.23, 21.01, 'Warsaw'),
  node('lodz', 'city', 'POL', 'POL-REST', 51.76, 19.46, 'Łódź'),
  // Germany
  node('duisburg', 'dry-port', 'DEU', 'DEU-DUI', 51.43, 6.76, 'Duisburg'),
  node('hamburg', 'port', 'DEU', 'DEU-REST', 53.55, 9.99, 'Port_of_Hamburg'),
  // Azerbaijan
  node('baku-alat', 'port', 'AZE', 'AZE-BAK', 39.95, 49.4, 'Port_of_Baku'),
  // Türkiye
  node('kars', 'city', 'TUR', 'TUR-KAR', 40.6, 43.1, 'Kars'),
  node('ankara', 'city', 'TUR', 'TUR-REST', 39.93, 32.86, 'Ankara'),
  node('istanbul', 'city', 'TUR', 'TUR-IST', 41.01, 28.98, 'Istanbul'),
  node('mersin', 'port', 'TUR', 'TUR-REST', 36.8, 34.63, 'Mersin'),
  node('bosporus', 'chokepoint', 'TUR', 'TUR-IST', 41.12, 29.07, 'Bosporus'),
  // Iran
  node('tehran', 'city', 'IRN', 'IRN-THR', 35.69, 51.39, 'Tehran'),
  node('mashhad', 'city', 'IRN', 'IRN-REST', 36.3, 59.61, 'Mashhad'),
  node('bandar-abbas', 'port', 'IRN', 'IRN-BND', 27.18, 56.27, 'Bandar_Abbas'),
  node('sarakhs', 'border', 'IRN', 'IRN-REST', 36.54, 61.16, 'Sarakhs'),
  // Pakistan
  node('khunjerab', 'border', 'PAK', 'PAK-GB', 36.85, 75.43, 'Khunjerab_Pass'),
  node('gilgit', 'city', 'PAK', 'PAK-GB', 35.92, 74.31, 'Gilgit'),
  node('islamabad', 'city', 'PAK', 'PAK-REST', 33.69, 73.05, 'Islamabad'),
  node('lahore', 'city', 'PAK', 'PAK-PUN', 31.55, 74.34, 'Lahore'),
  node('karachi', 'port', 'PAK', 'PAK-SIN', 24.85, 67, 'Port_of_Karachi'),
  node('gwadar', 'port', 'PAK', 'PAK-BAL', 25.12, 62.33, 'Gwadar_Port'),
  // Egypt
  node('cairo', 'city', 'EGY', 'EGY-CAI', 30.04, 31.24, 'Cairo'),
  node('ain-sokhna', 'port', 'EGY', 'EGY-SCZ', 29.6, 32.35, 'Ain_Sokhna'),
  node('port-said', 'port', 'EGY', 'EGY-SCZ', 31.26, 32.3, 'Port_Said'),
  node('suez-canal', 'chokepoint', 'EGY', 'EGY-SCZ', 30.58, 32.3, 'Suez_Canal'),
  // Greece
  node('piraeus', 'port', 'GRC', 'GRC-PIR', 37.94, 23.64, 'Port_of_Piraeus'),
  // Transit countries outside the 13 + 7
  node('tbilisi', 'city', 'GEO', null, 41.72, 44.79, 'Tbilisi'),
  node('poti', 'port', 'GEO', null, 42.15, 41.67, 'Poti'),
  node('ashgabat', 'city', 'TKM', null, 37.95, 58.38, 'Ashgabat'),
  node('ulaanbaatar', 'city', 'MNG', null, 47.92, 106.92, 'Ulaanbaatar'),
  node('bishkek', 'city', 'KGZ', null, 42.87, 74.59, 'Bishkek'),
  node('singapore', 'port', 'SGP', null, 1.26, 103.84, 'Port_of_Singapore'),
  node('malacca', 'chokepoint', 'MYS', null, 2.5, 101.4, 'Strait_of_Malacca'),
  node('colombo', 'port', 'LKA', null, 6.95, 79.84, 'Port_of_Colombo'),
  node('djibouti', 'port', 'DJI', null, 11.6, 43.14, 'Port_of_Djibouti'),
  node('bab-el-mandeb', 'chokepoint', 'YEM', null, 12.58, 43.33, 'Bab-el-Mandeb'),
  node('hormuz', 'chokepoint', 'OMN', null, 26.57, 56.25, 'Strait_of_Hormuz'),
  node('gibraltar', 'chokepoint', 'ESP', null, 35.95, -5.6, 'Strait_of_Gibraltar'),
  node('cape-of-good-hope', 'chokepoint', 'ZAF', null, -34.36, 18.47, 'Cape_of_Good_Hope'),
  node('rotterdam', 'port', 'NLD', null, 51.95, 4.14, 'Port_of_Rotterdam'),
  node('budapest', 'city', 'HUN', null, 47.5, 19.04, 'Budapest'),
];

/** [from, to, mode, km, capacity, handlingHours] */
type Row = readonly [string, string, Mode, number, number, number];

const links = (open: boolean, source: string, rows: readonly Row[]): RouteLink[] =>
  rows.map(([from, to, mode, km, capacity, handlingHours]) => ({
    id: `${from}~${to}~${mode}`,
    from,
    to,
    mode,
    km,
    open,
    capacity,
    handlingHours,
    provenance: 'estimated',
    source,
  }));

// Distances follow the real lines and shipping lanes. Handling hours: 1435 ↔ 1520 mm gauge
// breaks and customs at the borders (Alashankou–Dostyk, Khorgos, Zabaykalsk, Erenhot,
// Brest–Małaszewicze, Sarakhs, Akhalkalaki on the BTK line), about 12 h per port call on
// each side of a sea leg, and waits for a full load on the Caspian ferries.
export const LINKS: readonly RouteLink[] = [
  // China's trunk lines to the western and northern border crossings.
  ...links(
    true,
    wiki(
      'Rail_transport_in_China',
      'Longhai_railway',
      'Lanzhou–Xinjiang_railway',
      'Northern_Xinjiang_railway',
      'Southern_Xinjiang_railway',
      'Jining–Erenhot_railway',
    ),
    [
      ['chongqing', 'xian', 'rail', 820, 1, 0],
      ['chengdu', 'chongqing', 'rail', 340, 1, 0],
      ['chengdu', 'xian', 'rail', 842, 1, 0],
      ['chongqing', 'guangzhou', 'rail', 1500, 1, 12],
      ['beijing', 'xian', 'rail', 1200, 1, 0],
      ['beijing', 'tianjin', 'rail', 170, 1, 12],
      ['shanghai', 'xian', 'rail', 1510, 1, 12],
      ['yiwu', 'xian', 'rail', 1550, 1, 0],
      ['yiwu', 'ningbo', 'rail', 200, 1, 12],
      ['xian', 'urumqi', 'rail', 2570, 1, 0],
      ['urumqi', 'alashankou', 'rail', 477, 1, 0],
      ['urumqi', 'khorgos', 'rail', 710, 0.6, 0],
      ['urumqi', 'kashgar', 'rail', 1590, 0.5, 0],
      ['beijing', 'erenhot', 'rail', 830, 0.8, 0],
      ['beijing', 'manzhouli', 'rail', 2180, 1, 0],
    ],
  ),
  // Northern China–Europe route: Kazakhstan, Russia, Belarus, Poland, Germany.
  ...links(
    true,
    wiki(
      'Chongqing–Xinjiang–Europe_International_Railway',
      'Turkestan–Siberia_Railway',
      'Trans-Siberian_Railway',
      'Moscow–Brest_railway',
      'Małaszewicze',
      'Khorgos_Gateway',
    ),
    [
      ['alashankou', 'dostyk', 'rail', 15, 0.8, 30],
      // Zhetygen–Altynkol line, linked to China's Khorgos station in December 2012.
      ['khorgos', 'khorgos-gateway', 'rail', 12, 0.6, 30],
      ['khorgos-gateway', 'almaty', 'rail', 330, 0.6, 0],
      ['dostyk', 'astana', 'rail', 1340, 0.8, 0],
      ['dostyk', 'almaty', 'rail', 880, 0.8, 0],
      ['almaty', 'astana', 'rail', 1250, 0.8, 0],
      ['astana', 'yekaterinburg', 'rail', 1150, 0.8, 2],
      ['yekaterinburg', 'moscow', 'rail', 1816, 1, 0],
      ['novosibirsk', 'yekaterinburg', 'rail', 1520, 1, 0],
      ['moscow', 'minsk', 'rail', 750, 1, 1],
      ['moscow', 'st-petersburg', 'rail', 650, 1, 12],
      ['minsk', 'brest', 'rail', 350, 1, 0],
      ['brest', 'malaszewicze', 'rail', 18, 0.6, 40],
      ['malaszewicze', 'warsaw', 'rail', 195, 0.8, 0],
      ['warsaw', 'lodz', 'rail', 135, 1, 0],
      ['warsaw', 'duisburg', 'rail', 1150, 1, 1],
      ['warsaw', 'hamburg', 'rail', 870, 1, 12],
      ['duisburg', 'hamburg', 'rail', 370, 1, 12],
      ['duisburg', 'rotterdam', 'rail', 240, 1, 12],
      ['budapest', 'duisburg', 'rail', 1250, 1, 1],
    ],
  ),
  // Trans-Siberian feeders via Manzhouli–Zabaykalsk and Erenhot–Ulaanbaatar.
  ...links(true, wiki('Trans-Siberian_Railway', 'Trans-Mongolian_Railway', 'Zabaykalsk'), [
    ['manzhouli', 'zabaykalsk', 'rail', 15, 0.8, 30],
    ['zabaykalsk', 'novosibirsk', 'rail', 3330, 1, 0],
    ['erenhot', 'ulaanbaatar', 'rail', 720, 0.4, 30],
    ['ulaanbaatar', 'novosibirsk', 'rail', 2960, 0.4, 6],
  ]),
  // Central Asia: Kazakhstan–Uzbekistan–Turkmenistan rail and the Kyrgyz mountain roads.
  ...links(
    true,
    wiki(
      'Rail_transport_in_Kazakhstan',
      'Rail_transport_in_Uzbekistan',
      'Rail_transport_in_Turkmenistan',
      'Irkeshtam_Pass',
      'Torugart_Pass',
    ),
    [
      ['almaty', 'tashkent', 'rail', 950, 0.6, 12],
      ['almaty', 'aktau', 'rail', 2950, 0.5, 0],
      ['tashkent', 'ashgabat', 'rail', 1300, 0.4, 12],
      ['ashgabat', 'sarakhs', 'rail', 345, 0.3, 24],
      // Kamchik pass road; before 2016 Fergana rail traffic had to transit Tajikistan.
      ['tashkent', 'andijan', 'road', 330, 0.2, 0],
      // China–Kyrgyzstan–Uzbekistan road via Irkeshtam and Osh.
      ['kashgar', 'andijan', 'road', 520, 0.15, 24],
      ['kashgar', 'bishkek', 'road', 700, 0.15, 24],
      ['bishkek', 'almaty', 'road', 240, 0.3, 6],
    ],
  ),
  // Iran and Türkiye: Tejen–Sarakhs–Mashhad, the Trans-Iranian line and Anatolian mainlines.
  ...links(
    true,
    wiki('Rail_transport_in_Iran', 'Trans-Iranian_Railway', 'Rail_transport_in_Turkey'),
    [
      ['sarakhs', 'mashhad', 'rail', 165, 0.3, 0],
      ['mashhad', 'tehran', 'rail', 926, 0.8, 0],
      ['tehran', 'bandar-abbas', 'rail', 1480, 0.6, 12],
      // Via Tabriz, Kapıköy and the Lake Van train ferry.
      ['tehran', 'ankara', 'rail', 2300, 0.2, 36],
      ['kars', 'ankara', 'rail', 1310, 0.4, 0],
      ['ankara', 'istanbul', 'rail', 577, 0.6, 0],
      ['ankara', 'mersin', 'rail', 700, 0.5, 12],
    ],
  ),
  // Middle Corridor pieces operating in 2013 and the Piraeus–Budapest land-sea route.
  ...links(
    true,
    wiki('Trans-Caspian_International_Transport_Route', 'Port_of_Aktau', 'Georgian_Railway'),
    [
      ['aktau', 'baku-alat', 'sea', 470, 0.1, 72],
      ['baku-alat', 'tbilisi', 'rail', 510, 0.5, 8],
      ['tbilisi', 'poti', 'rail', 312, 0.5, 12],
      ['piraeus', 'budapest', 'rail', 1550, 0.3, 36],
    ],
  ),
  // CPEC: Karakoram Highway, the ageing ML-1 railway and the Makran coastal road.
  ...links(
    true,
    wiki(
      'Karakoram_Highway',
      'Khunjerab_Pass',
      'Karachi–Peshawar_Railway_Line',
      'Makran_Coastal_Highway',
    ),
    [
      ['kashgar', 'khunjerab', 'road', 420, 0.1, 12],
      // Sost dry port customs; the pass closes in winter.
      ['khunjerab', 'gilgit', 'road', 270, 0.1, 24],
      ['gilgit', 'islamabad', 'road', 600, 0.15, 0],
      ['islamabad', 'lahore', 'rail', 290, 0.5, 0],
      ['lahore', 'karachi', 'rail', 1240, 0.5, 12],
      ['karachi', 'gwadar', 'road', 650, 0.2, 12],
    ],
  ),
  ...links(true, wiki('Ain_Sokhna', 'Port_Said', 'Suez_Canal_Economic_Zone'), [
    ['ain-sokhna', 'cairo', 'road', 130, 0.5, 12],
    ['port-said', 'cairo', 'road', 210, 0.5, 12],
  ]),
  // Maritime Silk Road lanes, the Gulf and the Cape of Good Hope diversion.
  ...links(
    true,
    wiki(
      '21st_Century_Maritime_Silk_Road',
      'Strait_of_Malacca',
      'Suez_Canal',
      'Bab-el-Mandeb',
      'Strait_of_Hormuz',
      'Red_Sea_crisis',
    ),
    [
      ['tianjin', 'shanghai', 'sea', 1350, 1, 24],
      ['shanghai', 'ningbo', 'sea', 230, 1, 24],
      ['ningbo', 'xiamen', 'sea', 800, 1, 24],
      ['xiamen', 'guangzhou', 'sea', 670, 1, 24],
      ['guangzhou', 'singapore', 'sea', 2800, 1, 24],
      ['singapore', 'malacca', 'sea', 320, 1, 12],
      ['malacca', 'colombo', 'sea', 2600, 1, 12],
      ['colombo', 'bab-el-mandeb', 'sea', 4250, 1, 12],
      ['bab-el-mandeb', 'djibouti', 'sea', 130, 0.5, 12],
      ['bab-el-mandeb', 'ain-sokhna', 'sea', 2260, 1, 12],
      ['ain-sokhna', 'suez-canal', 'sea', 125, 1, 12],
      // Convoy transit of the canal plus the Port Said call.
      ['suez-canal', 'port-said', 'sea', 80, 1, 24],
      ['port-said', 'piraeus', 'sea', 1150, 1, 24],
      ['port-said', 'gibraltar', 'sea', 3600, 1, 12],
      ['port-said', 'mersin', 'sea', 700, 0.5, 24],
      ['piraeus', 'istanbul', 'sea', 670, 0.8, 24],
      ['istanbul', 'bosporus', 'sea', 20, 0.8, 6],
      ['bosporus', 'poti', 'sea', 1150, 0.5, 12],
      ['piraeus', 'gibraltar', 'sea', 2750, 1, 12],
      ['gibraltar', 'rotterdam', 'sea', 2650, 1, 12],
      ['rotterdam', 'hamburg', 'sea', 560, 1, 24],
      ['st-petersburg', 'hamburg', 'sea', 1650, 0.6, 24],
      ['colombo', 'cape-of-good-hope', 'sea', 8150, 1, 12],
      ['cape-of-good-hope', 'gibraltar', 'sea', 8700, 1, 0],
      ['colombo', 'hormuz', 'sea', 3450, 1, 12],
      ['hormuz', 'bandar-abbas', 'sea', 80, 1, 12],
      ['hormuz', 'bab-el-mandeb', 'sea', 2750, 1, 0],
      ['gwadar', 'hormuz', 'sea', 680, 0.3, 12],
      ['gwadar', 'bab-el-mandeb', 'sea', 2600, 0.3, 12],
      ['karachi', 'gwadar', 'sea', 520, 0.5, 24],
      ['karachi', 'colombo', 'sea', 2550, 1, 24],
    ],
  ),
  // Central Asia–China gas pipeline (lines A/B 2009–10, C 2014) into the West–East pipelines.
  // Ashgabat stands in for the gas fields of eastern Turkmenistan.
  ...links(true, wiki('Central_Asia–China_gas_pipeline', 'West–East_Gas_Pipeline'), [
    ['ashgabat', 'tashkent', 'pipeline', 1100, 1, 0],
    ['tashkent', 'almaty', 'pipeline', 800, 1, 0],
    ['almaty', 'khorgos', 'pipeline', 330, 1, 0],
    ['khorgos', 'xian', 'pipeline', 2950, 1, 0],
    ['xian', 'shanghai', 'pipeline', 1600, 1, 0],
  ]),
  // Built after September 2013; each is opened by one project in projects.ts.
  ...links(false, wiki('Baku–Tbilisi–Kars_railway'), [
    // Includes the Akhalkalaki gauge-change station and the Georgia–Türkiye border.
    ['tbilisi', 'kars', 'rail', 320, 0.3, 30],
  ]),
  ...links(false, wiki('Kazakhstan–Turkmenistan–Iran_railway'), [
    // Uzen–Bereket–Gorgan, then the existing Gorgan–Tehran line; gauge break at Inche Burun.
    ['aktau', 'tehran', 'rail', 1575, 0.3, 36],
  ]),
  ...links(false, wiki('Angren–Pap_railway'), [['tashkent', 'andijan', 'rail', 365, 0.4, 0]]),
  ...links(false, wiki('Kuryk', 'Trans-Caspian_International_Transport_Route'), [
    ['aktau', 'kuryk', 'rail', 80, 0.5, 0],
    ['kuryk', 'baku-alat', 'sea', 430, 0.15, 60],
  ]),
  // Marmaray joins the Asian and European rail networks under the Bosporus.
  ...links(false, wiki('Marmaray'), [['istanbul', 'budapest', 'rail', 1400, 0.4, 24]]),
  // Power of Siberia: Yakutian gas via Blagoveshchensk–Heihe to Hebei. Zabaykalsk stands in
  // for the Russian Far East entry point, so the length is a field-to-Beijing estimate.
  ...links(false, wiki('Power_of_Siberia'), [['zabaykalsk', 'beijing', 'pipeline', 3000, 0.7, 0]]),
];
