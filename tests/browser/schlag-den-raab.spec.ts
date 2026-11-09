import { expect, test } from './browserApp'

test('Abend-Hub: PIN öffnet Abendstand und Codenames, der Haupt-Hub zeigt sie nicht', async ({ app, page }) => {
  await app.open('/')
  await expect(page.getByRole('link', { name: 'Codenames öffnen' })).toHaveCount(0)

  await app.open('/schlag-den-raab')
  await page.getByLabel('Passwort').fill('5340')
  await page.getByRole('button', { name: 'Freischalten' }).click()
  await expect(page.getByRole('heading', { name: 'Schlag den XYZ' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Codenames öffnen' }).first()).toHaveAttribute('href', '/schlag-den-raab/codenames')

  await page.getByRole('link', { name: 'Abendstand öffnen' }).locator('visible=true').click()
  await expect(page).toHaveURL(/\/schlag-den-raab\/abendstand$/)
  await expect(page.getByRole('heading', { name: 'Abendstand' })).toBeVisible()
  await app.expectHealthy()
})

test('Abend-Hub: alte Codenames-Adresse leitet hinter die PIN weiter', async ({ app, page }) => {
  await app.open('/apps/codenames')
  await expect(page).toHaveURL(/\/schlag-den-raab\/codenames$/)
  await expect(page.getByLabel('Passwort')).toBeVisible()
})

test('Abendstand: Tortenstück zeigt Spiel, Person und Punkte im Tooltip @desktop', async ({ app, page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('bengts-toolbox:schlag-den-raab:unlocked', 'true'))
  await app.open('/schlag-den-raab/abendstand')
  // Paul gewinnt Spiel 10 über den Zeilenschalter der Tabelle.
  await page.getByRole('button', { name: 'Paul gewinnt Spiel 10 eintragen' }).click()

  await page.locator('path[data-game="10"]').hover()
  const tooltip = page.locator('[data-slot="tooltip"]')
  await expect(tooltip).toContainText('Spiel 10')
  await expect(tooltip).toContainText('Paul · Spiel 10 · 10 Punkte')
  await app.expectHealthy()
})
