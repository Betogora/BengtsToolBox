export type TeamId = 'blue' | 'yellow'

export const appTeams: {
  id: TeamId
  name: string
  buttonLabel: string
  className: string
  dotClassName: string
}[] = [
  {
    id: 'blue',
    name: 'Blau',
    buttonLabel: 'Team Blau',
    className: 'border-blue-300 bg-blue-50 text-blue-950',
    dotClassName: 'bg-blue-500',
  },
  {
    id: 'yellow',
    name: 'Gelb',
    buttonLabel: 'Team Gelb',
    className: 'border-yellow-300 bg-yellow-50 text-yellow-950',
    dotClassName: 'bg-yellow-400',
  },
]

export function isTeamId(value: unknown): value is TeamId {
  return value === 'blue' || value === 'yellow'
}
