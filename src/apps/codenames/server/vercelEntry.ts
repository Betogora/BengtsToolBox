// Einstieg der Vercel Function; scripts/deployCodenamesProxy.mjs bündelt ihn nach api/codenames.js.
import { handleCodenamesRequest } from './proxy'

/** Zwei Modellaufrufe zu je höchstens 110 s passen in das Hobby-Maximum von 300 s. */
export const maxDuration = 300

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

function handle(request: Request): Promise<Response> {
  return handleCodenamesRequest(request, { secret: env.CODENAMES_SECRET ?? '', openRouterKey: env.OPENROUTER_API_KEY })
}

export const POST = handle
export const OPTIONS = handle
