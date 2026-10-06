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

  const results = page.locator('[role="combobox"]:visible:is(:not([aria-label]), [aria-label="Ergebnis"])')
  const resultCount = await results.count()
  expect(resultCount).toBeGreaterThan(0)
  for (let index = 0; index < resultCount; index += 1) {
    await results.nth(index).click()
    await page.getByRole('option', { name: '1 - 0', exact: true }).click()
    await expect(results.nth(index)).toContainText('1 - 0')
  }
  await page.getByRole('button', { name: 'Neue Runde' }).click()

  const correction = page.getByRole('combobox', { name: /korrigieren/ }).first()
  await expect(correction).toBeVisible()
  expect(await correction.evaluate((element) => element.getBoundingClientRect().height)).toBe(26)
  await correction.locator('svg:visible').click()
  await page.getByRole('option', { name: '0 - 1', exact: true }).click()
  await page.getByRole('dialog', { name: 'Paarungen neu erzeugen?' })
    .getByRole('button', { name: 'Neu erzeugen', exact: true }).click()
  await expect(correction).toContainText('0 - 1')
  await correction.focus()
  await correction.press('Enter')
  await expect(page.getByRole('option', { name: '0 - 1', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: 'Rangliste' }).click()
  await expect(page.locator('[role="tabpanel"]:visible')).toContainText('Niklas')
  await app.expectHealthy()
})
