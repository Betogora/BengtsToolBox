import { expect, test } from './browserApp'

test('abgelehnte automatische Namenskorrektur bleibt ohne Endlosschleife', async ({ app, page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem
    const key = 'app-hub:collection:apps/progress-dashboard/sessions/default/datasets'
    const createdAtClientIso = '2026-09-01T18:00:00.000Z'
    originalSetItem.call(localStorage, key, JSON.stringify([
      { id: 'dataset-current', name: 'Datensatz', position: 1, status: 'active', createdAtClientIso, events: [], unit: 'Getränke' },
      { id: 'archive', name: 'Datensatz 2026-09-01 20:00', position: 2, status: 'archived', archivedAtClientIso: createdAtClientIso, createdAtClientIso, events: [], unit: 'Getränke' },
    ]))
    Storage.prototype.setItem = function (storageKey, value) {
      if (storageKey === key) throw new DOMException('Full', 'QuotaExceededError')
      return originalSetItem.call(this, storageKey, value)
    }
  })
  await app.open('/apps/progress-dashboard')
  await expect(page.getByText('Der lokale Speicher ist voll. Die Änderung wurde nicht gespeichert.')).toBeVisible()
  await app.expectHealthy()
})

test('blockierter SessionStorage verhindert das Freischalten nicht', async ({ app, page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (this === window.sessionStorage) throw new DOMException('Blocked', 'SecurityError')
      return originalSetItem.call(this, key, value)
    }
  })
  await app.open('/schlag-den-raab')
  await page.getByLabel('Passwort').fill('5340')
  await page.getByRole('button', { name: 'Freischalten' }).click()
  await expect(page.getByLabel('Passwort')).toBeHidden()
  await app.expectHealthy()
})

test('fehlgeschlagenes Hinzufügen zeigt keine Erfolgsmeldung', async ({ app, page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.includes('progress-dashboard') && key.endsWith('/players')) {
        throw new DOMException('Full', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    }
  })
  await app.open('/apps/progress-dashboard')
  await page.getByRole('button', { name: 'Spieler hinzufügen' }).click()
  await expect(page.getByText('Der lokale Speicher ist voll. Die Änderung wurde nicht gespeichert.')).toBeVisible()
  await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0)
  await app.expectHealthy()
})

test('LocalStorage-Quota-Fehler wird angezeigt und die Aktion zurückgerollt', async ({
  app,
  page,
}) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem

    Storage.prototype.setItem = function setItem(key, value) {
      if (key.startsWith('app-hub:doc:apps/randomizer/')) {
        throw new DOMException('Local storage quota exceeded', 'QuotaExceededError')
      }

      return originalSetItem.call(this, key, value)
    }
  })

  await app.open('/apps/randomizer')

  await expect(page.getByText('Noch keine Würfe vorhanden.')).toBeVisible()
  await page.getByRole('button', { name: 'Würfeln' }).last().click()

  await expect(
    page.getByText('Der lokale Speicher ist voll. Die Änderung wurde nicht gespeichert.'),
  ).toBeVisible()
  const saveErrorToast = page.locator('[data-sonner-toast]').filter({
    hasText: 'Der Wurf konnte nicht gespeichert werden.',
  })
  await expect(saveErrorToast).toBeVisible()
  await expect(saveErrorToast).toHaveCSS('opacity', '1')
  await expect(page.getByText('Noch keine Würfe vorhanden.')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Würfeln' }).first().getByText('-'),
  ).toBeVisible()
  await app.expectHealthy()
})
