import type { Page } from '@playwright/test'

import { seededRandomInt } from '../../src/apps/codenames/logic/random'
import { handleCodenamesRequest, RateLimiter } from '../../src/apps/codenames/server/proxy'
import { WORDLIST_TEXTS } from '../../src/apps/codenames/server/wordlists'
import { expect, test } from './browserApp'

const proxyUrl = 'https://bengtstoolbox-ki.vercel.app/api/codenames'

// Der KI-Proxy läuft im Testprozess ohne OpenRouter-Schlüssel; weder Vercel noch OpenRouter werden erreicht.
async function unlockEveningHub(page: Page) {
  await page.addInitScript(() => window.sessionStorage.setItem('bengts-toolbox:schlag-den-raab:unlocked', 'true'))
}

async function routeProxy(page: Page) {
  await unlockEveningHub(page)
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
  await app.open('/schlag-den-raab/codenames')
  const wordlist = page.getByRole('radiogroup', { name: 'Wortliste' })
  await expect(wordlist.getByRole('radio', { name: 'Original' })).toBeChecked()
  await wordlist.getByRole('radio', { name: 'Duett' }).click()
  await page.getByRole('button', { name: 'Spiel starten' }).click()

  await expect(page.getByTestId('codenames-clue-word')).toHaveText(/^Platz/)
  const board = page.getByRole('group', { name: 'Spielbrett' })
  await expect(board.getByRole('button')).toHaveCount(25)
  await expect(board.locator('[data-color]')).toHaveCount(0)

  const first = board.getByRole('button').first()
  const word = (await first.textContent())!.replace(/­/g, '')
  expect(WORDLIST_TEXTS.duett.split('\n')).toContain(word)
  await first.click()
  await expect(page.getByText(new RegExp(`^${word}: `))).toBeVisible()
  await expect(board.locator('[data-color]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Rückgängig' }).first().click()
  await expect(board.locator('[data-color]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Neues Spiel' }).click()
  const dialog = page.getByRole('dialog', { name: 'Neues Spiel starten?' })
  await expect(dialog.getByRole('radio', { name: 'Duett' })).toBeChecked()
  await dialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(dialog).toBeHidden()
  await app.expectHealthy()
})

test('Codenames: KI-Fenster zeigt den Schlüsselstatus und speichert die Modellwahl @desktop', async ({ app, page }) => {
  await routeProxy(page)
  await app.open('/schlag-den-raab/codenames')
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
