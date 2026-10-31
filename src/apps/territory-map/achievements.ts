import {
  Building2,
  Compass,
  Globe2,
  Home,
  Landmark,
  MapPinned,
  Mountain,
  ShipWheel,
  Snowflake,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

import { getLocalDateKey } from '@/apps/territory-map/eventDates'
import type { TerritoryVisitEvent } from '@/apps/territory-map/types'
import type { TranslationKey } from '@/lib/i18n'

type AchievementDefinition = {
  id: string
  title: TranslationKey
  Icon: LucideIcon
  rule: TranslationKey
  matches: (event: TerritoryVisitEvent) => boolean
}

type AchievementResult = AchievementDefinition & {
  winnerNames: string[]
  // Der erste passende Besuch je Person, also womit sie den Erfolg freigeschaltet hat.
  unlocks: TerritoryVisitEvent[]
}

const africanTerritoryIds = new Set([
  'ao',
  'bf',
  'bi',
  'bj',
  'bw',
  'cd',
  'cf',
  'cg',
  'ci',
  'cm',
  'cv',
  'dj',
  'dz',
  'eg',
  'eh',
  'er',
  'et',
  'ga',
  'gh',
  'gm',
  'gn',
  'gq',
  'gw',
  'ke',
  'km',
  'lr',
  'ls',
  'ly',
  'ma',
  'mg',
  'ml',
  'mr',
  'mu',
  'mw',
  'mz',
  'na',
  'ne',
  'ng',
  'rw',
  'sc',
  'sd',
  'sh',
  'sl',
  'sn',
  'so',
  'sol',
  'ss',
  'st',
  'sz',
  'td',
  'tg',
  'tn',
  'tz',
  'ug',
  'za',
  'zm',
  'zw',
])
const nordicTerritoryIds = new Set(['dk', 'fi', 'fo', 'gl', 'is', 'nor', 'se'])
const alpineTerritoryIds = new Set(['at', 'ch'])
const balkanTerritoryIds = new Set([
  'al',
  'ba',
  'bg',
  'gr',
  'hr',
  'kos',
  'me',
  'mk',
  'ro',
  'rs',
  'si',
])
const americaTerritoryIds = new Set([
  'ag',
  'ai',
  'ar',
  'aw',
  'bb',
  'bm',
  'bo',
  'br',
  'bs',
  'bz',
  'ca',
  'cl',
  'co',
  'cr',
  'cu',
  'cw',
  'dm',
  'do',
  'ec',
  'fk',
  'gd',
  'gt',
  'gy',
  'hn',
  'ht',
  'jm',
  'kn',
  'lc',
  'mf',
  'mx',
  'ni',
  'pa',
  'pe',
  'pr',
  'py',
  'sr',
  'sx',
  'tc',
  'tt',
  'us',
  'uy',
  'vc',
  've',
  'vg',
  'vi',
])
const pacificTerritoryIds = new Set([
  'as',
  'au',
  'ck',
  'fj',
  'fm',
  'gu',
  'ki',
  'mh',
  'nc',
  'nr',
  'nu',
  'nz',
  'pf',
  'pg',
  'pw',
  'sb',
  'to',
  'tv',
  'vu',
  'wf',
  'ws',
])
const microstateTerritoryIds = new Set(['ad', 'li', 'mc', 'mt', 'sm', 'va'])
const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'sushi-in-afrika',
    title: 'territory.achievement.sushi-in-afrika.title',
    Icon: Globe2,
    rule: 'territory.achievement.sushi-in-afrika.rule',
    matches: (event) =>
      event.mapId === 'world' && africanTerritoryIds.has(event.territoryId),
  },
  {
    id: 'heimspiel',
    title: 'territory.achievement.heimspiel.title',
    Icon: Home,
    rule: 'territory.achievement.heimspiel.rule',
    matches: (event) =>
      (event.mapId === 'world' && event.territoryId === 'de') ||
      event.mapId === 'germany',
  },
  {
    id: 'nordlicht',
    title: 'territory.achievement.nordlicht.title',
    Icon: Snowflake,
    rule: 'territory.achievement.nordlicht.rule',
    matches: (event) =>
      event.mapId === 'world' && nordicTerritoryIds.has(event.territoryId),
  },
  {
    id: 'alpengeschmack',
    title: 'territory.achievement.alpengeschmack.title',
    Icon: Mountain,
    rule: 'territory.achievement.alpengeschmack.rule',
    matches: (event) =>
      event.mapId === 'world' && alpineTerritoryIds.has(event.territoryId),
  },
  {
    id: 'balkan-rolle',
    title: 'territory.achievement.balkan-rolle.title',
    Icon: MapPinned,
    rule: 'territory.achievement.balkan-rolle.rule',
    matches: (event) =>
      event.mapId === 'world' && balkanTerritoryIds.has(event.territoryId),
  },
  {
    id: 'sushi-in-amerika',
    title: 'territory.achievement.sushi-in-amerika.title',
    Icon: Compass,
    rule: 'territory.achievement.sushi-in-amerika.rule',
    matches: (event) =>
      event.mapId === 'world' && americaTerritoryIds.has(event.territoryId),
  },
  {
    id: 'pazifik-teller',
    title: 'territory.achievement.pazifik-teller.title',
    Icon: ShipWheel,
    rule: 'territory.achievement.pazifik-teller.rule',
    matches: (event) =>
      event.mapId === 'world' && pacificTerritoryIds.has(event.territoryId),
  },
  {
    id: 'mikro-maki',
    title: 'territory.achievement.mikro-maki.title',
    Icon: Landmark,
    rule: 'territory.achievement.mikro-maki.rule',
    matches: (event) =>
      event.mapId === 'world' && microstateTerritoryIds.has(event.territoryId),
  },
  {
    id: 'land-der-sushi',
    title: 'territory.achievement.land-der-sushi.title',
    Icon: UtensilsCrossed,
    rule: 'territory.achievement.land-der-sushi.rule',
    matches: (event) => event.mapId === 'world' && event.territoryId === 'jp',
  },
  {
    id: 'hauptstadt-happen',
    title: 'territory.achievement.hauptstadt-happen.title',
    Icon: Building2,
    rule: 'territory.achievement.hauptstadt-happen.rule',
    matches: (event) => event.mapId === 'germany' && event.territoryId === 'DE-BE',
  },
]

export function getAchievements(events: TerritoryVisitEvent[]): AchievementResult[] {
  const sortedEvents = events
    .map((event) => ({ dateKey: getLocalDateKey(event.createdAtClientIso), event }))
    .filter(({ dateKey }) => dateKey)
    .sort(
      (left, right) =>
        left.dateKey.localeCompare(right.dateKey) ||
        left.event.position - right.event.position,
    )
    .map(({ event }) => event)

  return achievementDefinitions.map((achievement) => {
    const winners = new Map<string, TerritoryVisitEvent>()

    sortedEvents.forEach((event) => {
      if (achievement.matches(event) && !winners.has(event.playerId)) {
        winners.set(event.playerId, event)
      }
    })
    const unlocks = [...winners.values()]

    return {
      ...achievement,
      winnerNames: unlocks.map((event) => event.playerName),
      unlocks,
    }
  })
}
