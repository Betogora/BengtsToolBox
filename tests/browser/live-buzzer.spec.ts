import { expect, test } from './browserApp'
import type { Page } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.route('**/src/lib/firebase/client.ts*', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace(/const isFirebaseConfigured = Boolean\([\s\S]*?\);/, 'const isFirebaseConfigured = false;')
    await route.fulfill({ response, body })
  })
})

async function joinHost(page: Page) {
  await page.getByRole('radio', { name: 'Spielleitung', exact: true }).click()
  await page.getByLabel('Dein Spielername').fill('Bengt')
  await page.getByRole('button', { name: 'Beitreten', exact: true }).click()
  await page.getByRole('switch', { name: 'Auch mitspielen' }).click()
  await page.getByRole('button', { name: 'Uhrabgleich starten' }).click()
  await page.getByRole('button', { name: 'Neue Runde freigeben' }).click()
}

test('Rundenboard hides entry fields, decides automatically and keeps profile editable', async ({ app, page }) => {
  await app.open('/apps/live-buzzer')
  await joinHost(page)
  await expect(page.getByLabel('Dein Spielername')).toHaveCount(0)
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page.getByRole('button', { name: 'Rot', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rot', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Schließen', exact: true }).click()
  const buzzer = page.getByRole('button', { name: 'Buzz', exact: true })
  await expect(buzzer).toBeEnabled()
  if (test.info().project.use.hasTouch) await buzzer.tap()
  else await buzzer.click()
  await expect(page.getByRole('button', { name: 'Buzz registriert', exact: true })).toBeDisabled()
  await expect(page.getByText('Sieger', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Buzz-Reihenfolge' })).toContainText('Bengt')
  await expect(page.getByText('Vorläufig', { exact: true })).toHaveCount(0)
  await app.expectHealthy()
  await page.getByRole('button', { name: 'Neue Runde freigeben' }).click()
  await expect(page.getByText('Runde 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buzz', exact: true })).toBeEnabled()
  await app.expectHealthy()
})

test('A new player waits for sync and twelve players remain readable', async ({ app, page }) => {
  await page.addInitScript(() => {
    const players = Array.from({ length: 12 }, (_, i) => ({
      id: 'player-' + i, position: i + 1, name: 'Spieler ' + (i + 1), ownerUid: 'other-' + i,
      joinedAtMs: 1, clockSyncId: 'sync', clockSyncedAtMs: Date.now(),
      teamId: ['blue', 'yellow', 'red'][Math.floor(i / 4)], isActive: true,
    }))
    localStorage.setItem('app-hub:realtime:live-buzzer/lobbies/default', JSON.stringify({
      state: { clockSyncId: 'sync', clockSyncRequestedAtMs: 1, isOpen: true, roundId: 'round-1', roundNumber: 1, history: [] },
      players: Object.fromEntries(players.map((player) => [player.id, player])),
    }))
  })
  await app.open('/apps/live-buzzer')
  await page.getByLabel('Dein Spielername').fill('Keyboard')
  await page.getByRole('button', { name: 'Beitreten', exact: true }).click()
  await expect(page.getByText('Spieler 12', { exact: true })).toBeVisible()
  // A late join waits for a new explicit host sync.
  await expect(page.getByRole('button', { name: 'Gesperrt', exact: true })).toBeDisabled()
  await app.expectHealthy()
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page.getByRole('button', { name: 'Spielleitung', exact: true }).click()
  await page.getByRole('button', { name: 'Schließen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Uhrabgleich starten' })).toBeEnabled()
})

test('A storage error does not acknowledge a buzz and permits retry @desktop', async ({ app, page }) => {
  await app.open('/apps/live-buzzer')
  await joinHost(page)
  await page.getByRole('button', { name: 'Buzz', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('list', { name: 'Buzz-Reihenfolge' }).getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Sieger', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Neue Runde freigeben' }).click()
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'app-hub:realtime:live-buzzer/lobbies/default') throw new DOMException('Full', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'Buzz', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText('lokale Speicher ist voll')
  await expect(page.getByRole('list', { name: 'Buzz-Reihenfolge' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Buzz', exact: true })).toBeEnabled()
})
