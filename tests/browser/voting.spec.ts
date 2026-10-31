import type { Page } from '@playwright/test'

import { expect, test } from './browserApp'

async function registerAndVote(page: Page, name: string, candidate: string) {
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Wer bist du?' })).toBeVisible()
  await dialog.getByLabel('Dein Name').fill(name)
  await dialog.getByRole('button', { name: /^Weiter/ }).click()
  await dialog.getByLabel('Name suchen oder neu eingeben').fill(candidate)
  const existing = dialog.getByRole('radio', { name: new RegExp(`^${candidate}`) })
  if (await existing.count()) await existing.first().click()
  else await dialog.getByRole('radio', { name: `„${candidate}“ hinzufügen` }).click()
  await dialog.getByRole('button', { name: `Für ${candidate} abstimmen` }).click()
  await expect(dialog).toBeHidden()
}

test('Kostümwettbewerb: Gast meldet sich per Dialog an und stimmt für einen neuen Namen', async ({ app, page }) => {
  await app.open('/apps/voting')
  await registerAndVote(page, 'Heinz', 'Franz')

  const round = page.locator('[data-voting-round]')
  await expect(round).toContainText('Deine Stimme')
  await expect(round).toContainText('Franz')
  await expect(page.locator('[data-voting-ballots]')).toHaveText('Abgegeben: 1')
  await expect(page.locator('[data-voting-results]')).toContainText('Das Ergebnis erscheint')
  await app.expectHealthy()
})

test('Kostümwettbewerb: Spielleitung führt Schreibweisen zusammen, wertet aus und archiviert @desktop', async ({ app, page }) => {
  await app.open('/apps/voting')
  await registerAndVote(page, 'Heinz', 'Franz')

  // Zweite Person am selben Gerät; der bereits genannte Name wird übernommen.
  await page.getByRole('button', { name: 'Nicht Heinz? Person wechseln' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Dein Name').fill('franz ')
  await expect(dialog.getByRole('status')).toContainText('steht schon auf der Liste')
  await dialog.getByRole('button', { name: 'Weiter als Franz' }).click()
  await dialog.getByLabel('Name suchen oder neu eingeben').fill('HZ')
  await dialog.getByRole('radio', { name: '„HZ“ hinzufügen' }).click()
  await dialog.getByRole('button', { name: 'Für HZ abstimmen' }).click()
  await expect(page.locator('[data-voting-ballots]')).toHaveText('Abgegeben: 2')

  await page.getByRole('button', { name: 'Bearbeitungsmodus', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Passwort').fill('1234')
  await page.getByRole('dialog').getByRole('button', { name: 'Freischalten' }).click()
  await expect(page.getByRole('dialog')).toContainText('nicht korrekt')
  await page.getByRole('dialog').getByLabel('Passwort').fill('5340')
  await page.getByRole('dialog').getByRole('button', { name: 'Freischalten' }).click()

  const heinz = page.locator('[data-voting-person="Heinz"]')
  await expect(page.locator('[data-voting-person="Franz"]')).toContainText('abgestimmt')
  await page.getByRole('button', { name: 'Zusammenführen', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Heinz' }).click()
  await page.getByRole('checkbox', { name: 'HZ' }).click()
  await page.getByRole('button', { name: 'Zusammenführen (2)' }).click()
  const mergeDialog = page.getByRole('dialog')
  await mergeDialog.getByRole('radio', { name: /Heinz/ }).click()
  await mergeDialog.getByRole('button', { name: 'Als Heinz zusammenführen' }).click()
  await expect(heinz.getByRole('list', { name: 'Weitere Schreibweisen von Heinz' })).toContainText('HZ')
  await expect(page.locator('[data-voting-person="HZ"]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Zwischenstand zeigen' }).click()
  await expect(heinz).toContainText('wählt Franz')
  await page.getByRole('button', { name: 'Abstimmung beenden' }).click()
  const winner = page.locator('[data-voting-winner]')
  await expect(winner).toContainText('Gleichstand')
  await expect(winner).toContainText('Franz & Heinz')
  await expect(page.locator('[data-voting-result="Heinz"]')).toContainText('Franz')

  await page.getByRole('button', { name: 'Neue Abstimmung', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Neue Abstimmung', exact: true }).click()
  await expect(page.locator('[data-voting-ballots]')).toHaveText('Abgegeben: 0')
  await expect(page.locator('[data-voting-person="Franz"]')).toContainText('noch keine Stimme')
  const archive = page.locator('[data-voting-archive="Bestes Kostüm"]')
  await expect(archive).toContainText('Franz & Heinz')
  await archive.getByRole('button', { name: 'Bestes Kostüm aufklappen' }).click()
  await expect(archive.locator('[data-voting-result="Franz"]')).toContainText('Heinz')
  await app.expectHealthy()
})
