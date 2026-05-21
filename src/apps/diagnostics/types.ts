export type DiagnosticStatus = 'ok' | 'warn' | 'error' | 'pending'

export type DiagnosticCheck = {
  id: string
  label: string
  detail: string
  status: DiagnosticStatus
}

export type DiagnosticHealth = {
  checkedAt: string
  message: string
  runId: string
  updatedBy: string
  writeCount: number
}
