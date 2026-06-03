import type { Territory, TerritoryMapId } from '@/apps/territory-map/types'

export const mapViewBoxes: Record<TerritoryMapId, string> = {
  world: '0 0 960 520',
  germany: '0 0 420 560',
}

// Local SVG territory data. The ids are stable so more precise source-derived
// paths can replace these shapes later without changing persisted claims.
export const worldTerritories: Territory[] = [
  { id: 'ca', name: 'Kanada', isoCode: 'CA', path: 'M75 60h170l18 84-34 43H82L52 126z' },
  { id: 'us', name: 'USA', isoCode: 'US', path: 'M92 200h190l22 63-42 52H126L74 260z' },
  { id: 'mx', name: 'Mexiko', isoCode: 'MX', path: 'M142 326h124l30 56-38 44h-78l-56-58z' },
  { id: 'br', name: 'Brasilien', isoCode: 'BR', path: 'M338 334h118l74 84-42 76H374l-70-78z' },
  { id: 'ar', name: 'Argentinien', isoCode: 'AR', path: 'M356 428h76l36 68-34 18h-62l-34-66z' },
  { id: 'cl', name: 'Chile', isoCode: 'CL', path: 'M318 410h28l24 102h-30l-32-94z' },
  { id: 'co', name: 'Kolumbien', isoCode: 'CO', path: 'M306 284h78l32 54-42 34-70-34z' },
  { id: 'pe', name: 'Peru', isoCode: 'PE', path: 'M286 350h76l18 62-52 22-58-46z' },
  { id: 'gb', name: 'Vereinigtes Koenigreich', isoCode: 'GB', path: 'M458 142h38l18 54-28 36-40-24z' },
  { id: 'fr', name: 'Frankreich', isoCode: 'FR', path: 'M486 220h66l20 58-48 38-58-32z' },
  { id: 'es', name: 'Spanien', isoCode: 'ES', path: 'M464 304h72l24 44-34 30h-72l-22-42z' },
  { id: 'de', name: 'Deutschland', isoCode: 'DE', path: 'M552 192h54l24 58-34 42-56-26z' },
  { id: 'it', name: 'Italien', isoCode: 'IT', path: 'M588 294h44l42 62-24 42-58-52z' },
  { id: 'pl', name: 'Polen', isoCode: 'PL', path: 'M618 184h66l26 50-34 38h-64l-18-46z' },
  { id: 'se', name: 'Schweden', isoCode: 'SE', path: 'M604 68h52l34 94-44 28-48-56z' },
  { id: 'no', name: 'Norwegen', isoCode: 'NO', path: 'M548 48h54l28 112-46 22-52-58z' },
  { id: 'ru', name: 'Russland', isoCode: 'RU', path: 'M680 58h212l44 118-72 78H708l-56-96z' },
  { id: 'tr', name: 'Tuerkei', isoCode: 'TR', path: 'M660 286h100l32 42-36 34h-102l-30-38z' },
  { id: 'eg', name: 'Aegypten', isoCode: 'EG', path: 'M588 354h82l32 62-36 46h-76l-34-58z' },
  { id: 'za', name: 'Suedafrika', isoCode: 'ZA', path: 'M594 454h110l34 42-42 24h-96l-42-34z' },
  { id: 'ng', name: 'Nigeria', isoCode: 'NG', path: 'M514 374h66l32 54-42 42h-64l-24-54z' },
  { id: 'ke', name: 'Kenia', isoCode: 'KE', path: 'M674 406h58l32 48-32 42h-62l-24-46z' },
  { id: 'sa', name: 'Saudi-Arabien', isoCode: 'SA', path: 'M706 346h88l46 58-52 62h-76l-46-58z' },
  { id: 'in', name: 'Indien', isoCode: 'IN', path: 'M770 318h74l44 86-38 72-62-36-46-74z' },
  { id: 'cn', name: 'China', isoCode: 'CN', path: 'M792 220h120l46 70-54 66H792l-52-62z' },
  { id: 'jp', name: 'Japan', isoCode: 'JP', path: 'M920 230h24l16 90-28 30-24-82z' },
  { id: 'kr', name: 'Suedkorea', isoCode: 'KR', path: 'M894 304h30l18 38-22 28-30-28z' },
  { id: 'id', name: 'Indonesien', isoCode: 'ID', path: 'M784 450h126l20 36-42 20H782l-34-26z' },
  { id: 'au', name: 'Australien', isoCode: 'AU', path: 'M766 414h132l46 56-44 48H774l-50-52z' },
  { id: 'nz', name: 'Neuseeland', isoCode: 'NZ', path: 'M900 482h46l14 22-28 14-44-16z' },
]

export const germanyTerritories: Territory[] = [
  { id: 'DE-SH', name: 'Schleswig-Holstein', path: 'M158 24h92l28 54-34 44h-90l-30-48z' },
  { id: 'DE-HH', name: 'Hamburg', path: 'M184 116h36l14 26-20 20h-34l-14-24z' },
  { id: 'DE-MV', name: 'Mecklenburg-Vorpommern', path: 'M256 92h104l34 50-40 42H258l-34-40z' },
  { id: 'DE-HB', name: 'Bremen', path: 'M112 158h30l12 22-18 18h-28l-12-22z' },
  { id: 'DE-NI', name: 'Niedersachsen', path: 'M74 136h180l42 84-44 64H92l-54-76z' },
  { id: 'DE-BE', name: 'Berlin', path: 'M300 218h34l16 24-18 24h-34l-16-24z' },
  { id: 'DE-BB', name: 'Brandenburg', path: 'M256 176h122l34 86-48 76H248l-42-80z' },
  { id: 'DE-ST', name: 'Sachsen-Anhalt', path: 'M186 260h92l42 72-44 64h-88l-42-74z' },
  { id: 'DE-NW', name: 'Nordrhein-Westfalen', path: 'M30 258h132l40 76-44 70H52L10 330z' },
  { id: 'DE-HE', name: 'Hessen', path: 'M122 372h94l42 76-42 64h-92l-42-72z' },
  { id: 'DE-TH', name: 'Thueringen', path: 'M222 380h96l42 56-36 54h-100l-42-56z' },
  { id: 'DE-SN', name: 'Sachsen', path: 'M312 366h82l24 64-40 48h-88l-34-54z' },
  { id: 'DE-RP', name: 'Rheinland-Pfalz', path: 'M70 424h72l34 72-34 54H70l-36-68z' },
  { id: 'DE-SL', name: 'Saarland', path: 'M30 500h48l24 34-24 26H34L8 532z' },
  { id: 'DE-BW', name: 'Baden-Wuerttemberg', path: 'M124 490h110l42 70-34 70H130l-42-70z' },
  { id: 'DE-BY', name: 'Bayern', path: 'M240 474h132l48 92-48 86H238l-46-84z' },
]

export const territoriesByMap: Record<TerritoryMapId, Territory[]> = {
  world: worldTerritories,
  germany: germanyTerritories,
}
