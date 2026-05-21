import type { BuzzerTeamId } from '@/apps/live-buzzer/types'

export type CounterPlayer = {
  id: string
  name: string
  score: number
  teamId: BuzzerTeamId | null
  position: number
  lastUpdatedBy?: string
}
