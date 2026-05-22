export type ProgressEventIcon =
  | 'plus'
  | 'minus'
  | 'wine'
  | 'beer'
  | 'schnaps'
  | 'funnel'

export type ProgressEventDelta = number

export type ProgressPlayer = {
  id: string
  name: string
  position: number
  color: string
  lastUpdatedBy?: string
}

export type ProgressEvent = {
  id: string
  playerId: string
  playerName: string
  playerColor: string
  valueDelta: ProgressEventDelta
  icon: ProgressEventIcon
  createdAtClientIso: string
  createdAtLabel: string
  position: number
  lastUpdatedBy?: string
}

export type ProgressDatasetStatus = 'active' | 'archived'

export type ProgressDataset = {
  id: string
  position: number
  name: string
  chartTitle: string
  unit: string
  status: ProgressDatasetStatus
  createdAtClientIso: string
  archivedAtClientIso: string | null
  events: ProgressEvent[]
  lastUpdatedBy?: string
}

export type ProgressDashboardState = {
  activeDatasetId: string
  updatedBy?: string
}

export type PlayerScore = {
  player: ProgressPlayer
  score: number
}
