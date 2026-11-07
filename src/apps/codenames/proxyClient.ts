import type {
  GameResponse,
  HintResponse,
  ProxyErrorBody,
  ProxyErrorCode,
  ProxyRequest,
  RevealResponse,
  StatusResponse,
} from '@/apps/codenames/logic/protocol'

export const CODENAMES_PROXY_URL =
  import.meta.env.VITE_CODENAMES_PROXY_URL || 'https://bengtstoolbox-ki.vercel.app/api/codenames'

export class ProxyRequestError extends Error {
  readonly code: ProxyErrorCode | 'network'

  constructor(message: string, code: ProxyErrorCode | 'network') {
    super(message)
    this.code = code
  }
}

async function post<T>(body: ProxyRequest): Promise<T> {
  let response: Response
  try {
    response = await fetch(CODENAMES_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ProxyRequestError('', 'network')
  }
  const data = (await response.json().catch(() => null)) as (T & Partial<ProxyErrorBody>) | null
  if (!response.ok || !data) {
    throw new ProxyRequestError(data?.error ?? `HTTP ${response.status}`, data?.code ?? 'server')
  }
  return data
}

export const codenamesProxy = {
  status: () => post<StatusResponse>({ action: 'status' }),
  newGame: () => post<GameResponse>({ action: 'new' }),
  reveal: (game: string, index: number) => post<RevealResponse>({ action: 'reveal', game, index }),
  pass: (game: string) => post<GameResponse>({ action: 'pass', game }),
  undo: (game: string) => post<GameResponse>({ action: 'undo', game }),
  hint: (request: Omit<Extract<ProxyRequest, { action: 'hint' }>, 'action'>) =>
    post<HintResponse>({ action: 'hint', ...request }),
}
