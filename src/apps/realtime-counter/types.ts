import type { TeamId } from '@/apps/shared/teams'

export type CounterPlayer = {
  id: string
  name: string
  score: number
  teamId: TeamId | null
  position: number
  lastUpdatedBy?: string
}
