import { expect, test } from './browserApp'

test('Turnierfluss bleibt auf allen Viewports bedienbar', async ({ app, page }) => {
  await app.open('/apps/swiss-tournaments')

  await expect(
    page.getByRole('heading', { level: 1, name: 'SK Anderten Turnier-App' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Neues Turnier' }).click()

  const createDialog = page.getByRole('dialog', { name: 'Neues Turnier anlegen' })
  await expect(createDialog).toBeVisible()
  await createDialog.getByRole('button', { name: 'Turnier starten' }).click()

  await page.getByRole('tab', { name: 'Paarungen' }).click()
  await page.getByRole('button', { name: 'Neue Runde' }).click()

  const resultSelect = page.locator('[role="combobox"]:visible').first()
  await resultSelect.click()
  await page.getByRole('option', { name: '1 - 0', exact: true }).click()

  await page.getByRole('tab', { name: 'Rangliste' }).click()
  await expect(page.locator('[role="tabpanel"]:visible')).toContainText('Niklas')
  await app.expectHealthy()
})
