import type { BuzzerTeamId } from '@/apps/live-buzzer/types'

export const buzzerTeams: {
  id: BuzzerTeamId
  name: string
  className: string
  dotClassName: string
}[] = [
  {
    id: 'red',
    name: 'Rot',
    className: 'border-red-300 bg-red-50 text-red-950',
    dotClassName: 'bg-red-500',
  },
  {
    id: 'blue',
    name: 'Blau',
    className: 'border-blue-300 bg-blue-50 text-blue-950',
    dotClassName: 'bg-blue-500',
  },
  {
    id: 'green',
    name: 'Gruen',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-950',
    dotClassName: 'bg-emerald-500',
  },
  {
    id: 'yellow',
    name: 'Gelb',
    className: 'border-yellow-300 bg-yellow-50 text-yellow-950',
    dotClassName: 'bg-yellow-400',
  },
  {
    id: 'purple',
    name: 'Lila',
    className: 'border-purple-300 bg-purple-50 text-purple-950',
    dotClassName: 'bg-purple-500',
  },
  {
    id: 'orange',
    name: 'Orange',
    className: 'border-orange-300 bg-orange-50 text-orange-950',
    dotClassName: 'bg-orange-500',
  },
]
