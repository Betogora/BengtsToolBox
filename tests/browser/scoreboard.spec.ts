import { expect, test } from './browserApp'

test('Scoreboard erhält Buchungen bei Moduswechsel, später Zuordnung und Archivierung @desktop', async ({ app, page }) => {
  await app.open('/apps/scoreboard')
  const card = (name: string) => page.getByRole('button', { name: `${name} einen Punkt hinzufügen`, exact: true })
    .locator('xpath=ancestor::*[@data-slot="card"]')
  const score = (name: string) => card(name).locator('.tabular-nums')
  const mode = page.getByRole('radiogroup', { name: 'Wertungsart' })
  const undo = page.getByRole('button', { name: 'Rückgängig', exact: true })
  await expect(undo).toHaveCount(2)
  await expect(undo.first()).toBeDisabled()

  await page.getByRole('button', { name: 'Spieler 1 einen Punkt hinzufügen', exact: true }).click()
  await mode.getByRole('radio', { name: 'Teams', exact: true }).click()
  await expect(score('Team 1')).toHaveText('1')
  await page.getByRole('button', { name: 'Spieler hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Spieler 3 einen Punkt hinzufügen', exact: true }).click()
  await expect(score('Spieler 3')).toHaveText('1')
  await expect(score('Team 1')).toHaveText('1')
  await page.getByRole('button', { name: 'Team hinzufügen', exact: true }).click()
  await card('Spieler 3').getByRole('combobox').click()
  await page.getByRole('option', { name: 'Team 3', exact: true }).click()
  await expect(score('Team 3')).toHaveText('1')

  await page.getByRole('button', { name: 'Team 3 einen Punkt hinzufügen', exact: true }).click()
  await mode.getByRole('radio', { name: 'Einzel', exact: true }).click()
  await expect(score('Spieler 3')).toHaveText('1')
  await mode.getByRole('radio', { name: 'Teams', exact: true }).click()
  await expect(score('Team 3')).toHaveText('2')
  await undo.first().click()
  await expect(score('Team 3')).toHaveText('1')
  await undo.last().click()
  await expect(score('Team 3')).toHaveText('0')
  await page.getByRole('button', { name: 'Spieler 3 einen Punkt hinzufügen', exact: true }).click()

  await page.getByRole('button', { name: 'Archivieren und neu starten', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Archivieren und neu starten', exact: true }).click()
  await expect(score('Spieler 3')).toHaveText('0')
  await card('Spieler 3').getByRole('combobox').click()
  await page.getByRole('option', { name: 'Team 2', exact: true }).click()
  await page.getByRole('button', { name: 'Alte Scorings', exact: false }).click()
  await page.getByRole('button', { name: 'aufklappen', exact: true }).click()
  const archivedPlayer = page.getByLabel('Punkte', { exact: true }).last().locator('..')
  await expect(archivedPlayer).toContainText('Spieler 3')
  await expect(archivedPlayer).toContainText('Team 3')
  await expect(page.getByLabel('Punkte', { exact: true }).last()).toHaveText('1')
  await app.expectHealthy()
})

test('Glücksrad schließt Gewinner per Hintergrund und Kreuz, aber nicht bei Klick im Ergebnis', async ({ app, page }) => {
  await page.addInitScript(() => {
    // A diagonal stop makes the rotated SVG box overlap the next spin button.
    Math.random = () => 0.125
    localStorage.setItem('app-hub:doc:apps/decision-wheel/state/default', JSON.stringify({
      entries: [{ id: 'option-one', text: 'Paul', color: '#FAC889', weight: 1 }],
      history: [],
      lastResult: null,
    }))
  })
  await app.open('/apps/decision-wheel')
  const result = page.getByRole('status').filter({ hasText: 'Gewinner' })
  for (const closeBy of ['background', 'button']) {
    await page.getByRole('button', { name: 'Drehen', exact: true }).click()
    await expect(result).toBeVisible()
    await result.click()
    await expect(result).toBeVisible()
    if (closeBy === 'background') await page.mouse.click(5, 5)
    else await page.getByRole('button', { name: 'Schließen', exact: true }).click()
    await expect(result).toBeHidden()
  }
  await app.expectHealthy()
})
