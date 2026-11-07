import type { Page } from '@playwright/test'

import { seededRandomInt } from '../../src/apps/codenames/logic/random'
import { handleCodenamesRequest, RateLimiter } from '../../src/apps/codenames/server/proxy'
import { expect, test } from './browserApp'

const proxyUrl = 'https://bengtstoolbox-ki.vercel.app/api/codenames'

// Der KI-Proxy läuft im Testprozess ohne OpenRouter-Schlüssel; weder Vercel noch OpenRouter werden erreicht.
async function routeProxy(page: Page) {
  const env = {
    secret: 'browsertest-geheimnis-mit-mindestens-32-zeichen',
    randomInt: seededRandomInt(7),
    limiter: new RateLimiter(),
  }
  await page.route(proxyUrl, async (route) => {
    const request = route.request()
    const response = await handleCodenamesRequest(
      new Request(proxyUrl, { method: request.method(), headers: await request.allHeaders(), body: request.postData() ?? undefined }),
      env,
    )
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: response.status === 204 ? '' : await response.text(),
    })
  })
}

test('Codenames: Spiel mit Platzhalter-Hinweis, Raten und Rückgängig', async ({ app, page }) => {
  await routeProxy(page)
  await app.open('/apps/codenames')
  await page.getByRole('button', { name: 'Spiel starten' }).click()

  await expect(page.getByTestId('codenames-clue-word')).toHaveText(/^Platz/)
  const board = page.getByRole('group', { name: 'Spielbrett' })
  await expect(board.getByRole('button')).toHaveCount(25)
  await expect(board.locator('[data-color]')).toHaveCount(0)

  const first = board.getByRole('button').first()
  const word = (await first.textContent())!.replace(/­/g, '')
  await first.click()
  await expect(page.getByText(new RegExp(`^${word}: `))).toBeVisible()
  await expect(board.locator('[data-color]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Rückgängig' }).first().click()
  await expect(board.locator('[data-color]')).toHaveCount(0)
  await app.expectHealthy()
})

test('Codenames: KI-Fenster zeigt den Schlüsselstatus und speichert die Modellwahl @desktop', async ({ app, page }) => {
  await routeProxy(page)
  await app.open('/apps/codenames')
  const button = page.getByRole('button', { name: /^KI/ })
  await expect(button).toContainText('Platzhalter')
  await button.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Kein Schlüssel bei Vercel')
  await expect(dialog.getByRole('textbox')).toHaveCount(1)
  await dialog.getByLabel('Modell').fill('anbieter/testmodell')
  await dialog.getByRole('radio', { name: 'Hoch' }).click()
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()

  const stored = await page.evaluate(() => window.localStorage.getItem('bengtstoolbox:codenames:ai'))
  expect(JSON.parse(stored!)).toEqual({ model: 'anbieter/testmodell', reasoning: 'high' })
  await app.expectHealthy()
})
