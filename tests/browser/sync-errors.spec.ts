import { expect, test } from './browserApp'

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
