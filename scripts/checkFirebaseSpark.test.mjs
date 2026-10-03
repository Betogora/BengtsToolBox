import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

async function check(body, status = 200) {
  vi.stubEnv('GOOGLE_ACCESS_TOKEN', 'test-token')
  vi.stubEnv('FIREBASE_PROJECT_ID', 'test-project')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.resetModules()
  return import('./checkFirebaseSpark.mjs')
}

it('allows only explicitly disabled billing without a linked account', async () => {
  await expect(check({ billingEnabled: false, billingAccountName: '' })).resolves.toBeDefined()
})
it.each([{ billingEnabled: true }, { billingEnabled: false, billingAccountName: 'billingAccounts/123' }, {}])(
  'rejects paid, linked, or unknown billing status: %j', async (body) => {
    await expect(check(body)).rejects.toThrow('nur Spark')
  },
)
it('fails closed if the billing API cannot be read', async () => {
  await expect(check({}, 403)).rejects.toThrow('Deployment abgebrochen')
})
