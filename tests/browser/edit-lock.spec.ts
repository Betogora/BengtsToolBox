import { expect, test } from './browserApp'

test('Bearbeitungs-PIN schützt Triathlon und Sushi Map, lässt Ansicht aber frei @desktop', async ({
  app,
  page,
}) => {
  await app.open('/apps/triathlon-tracker')
  const unlock = page.getByRole('dialog', { name: 'Bearbeitung freischalten' })

  // Ansehen braucht keine PIN.
  await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await page.getByRole('tab', { name: 'Planung', exact: true }).click()
  await expect(unlock).toHaveCount(0)

  await page.getByRole('button', { name: 'Weitere Aktionen', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Planen', exact: true }).click()
  const plan = page.getByRole('dialog', { name: 'Plan hinzufügen' })
  await plan.getByLabel('Kurzes Label').fill('Gesperrter Lauf')
  await plan.getByLabel('Dauer (m:ss / h:mm:ss)').fill('30')
  await plan.getByRole('button', { name: 'Speichern' }).click()

  await expect(unlock).toBeVisible()
  await unlock.getByLabel('PIN').fill('5340')
  await unlock.getByRole('button', { name: 'Freischalten' }).click()
  await expect(unlock.getByText('Die PIN ist nicht korrekt.')).toBeVisible()

  // Abbrechen lässt die Eingaben stehen und speichert nichts.
  await page.keyboard.press('Escape')
  await expect(unlock).toHaveCount(0)
  await expect(plan).toBeVisible()
  await expect(plan.getByText('Der Eintrag konnte nicht gespeichert werden.')).toHaveCount(0)
  await expect(page.locator('[data-planned-training]:visible')).toHaveCount(0)

  await plan.getByRole('button', { name: 'Speichern' }).click()
  await unlock.getByLabel('PIN').fill('9696')
  await unlock.getByRole('button', { name: 'Freischalten' }).click()
  await expect(plan).toHaveCount(0)
  await expect(page.locator('[data-planned-training]:visible')).toHaveCount(1)

  // Die Freischaltung gilt appübergreifend bis zum Ende der Sitzung.
  await app.open('/apps/sushi')
  await page.getByRole('button', { name: 'Touristen bearbeiten' }).click()
  await expect(page.getByRole('button', { name: 'Sushi-Tourist hinzufügen' })).toBeVisible()
  await expect(unlock).toHaveCount(0)
  await app.expectHealthy()
})

test('Sushi Map fragt die PIN erst beim Bearbeiten ab und hält Ansichtswechsel lokal @desktop', async ({
  app,
  page,
}) => {
  const sharedState = () =>
    page.evaluate(() =>
      window.localStorage.getItem('app-hub:doc:apps/territory-map/sessions/default/state/default') ?? '',
    )
  await app.open('/apps/sushi')
  const unlock = page.getByRole('dialog', { name: 'Bearbeitung freischalten' })
  const achievements = page.getByRole('button', { name: 'Erfolge' })

  await page.getByRole('radio', { name: 'Deutschland', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Bayern, / })).toBeVisible()
  await achievements.click()
  await expect(achievements).toHaveAttribute('aria-expanded', 'true')
  await expect(unlock).toHaveCount(0)
  // Ohne PIN landet der Ansichtswechsel nicht im gemeinsamen Zustand.
  expect(await sharedState()).not.toMatch(/germany|"isAchievementsOpen":true/)

  // Abbrechen lässt den Besuchsdialog samt Auswahl offen.
  await page.getByRole('button', { name: /^Bayern, / }).click()
  const claimDialog = page.getByRole('dialog', { name: 'Bayern Sushi-bereisen?' })
  await claimDialog.getByRole('button', { name: 'Nigiri gegessen' }).click()
  await expect(unlock).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(unlock).toHaveCount(0)
  await expect(claimDialog).toBeVisible()

  await claimDialog.getByRole('button', { name: 'Nigiri gegessen' }).click()
  await unlock.getByLabel('PIN').fill('9696')
  await unlock.getByRole('button', { name: 'Freischalten' }).click()
  await expect(claimDialog).toBeHidden()
  // Die lokale Ansicht bleibt nach dem Entsperren erhalten.
  await expect(page.getByRole('button', { name: 'Bayern, Bengt' })).toBeVisible()
  await expect(achievements).toHaveAttribute('aria-expanded', 'true')

  // Entsperrt werden Ansichtswechsel wieder geteilt.
  await achievements.click()
  await expect(achievements).toHaveAttribute('aria-expanded', 'false')
  expect(await sharedState()).toContain('"isAchievementsOpen":false')
  await page.getByRole('button', { name: 'Touristen bearbeiten' }).click()
  await expect(page.getByRole('button', { name: 'Sushi-Tourist hinzufügen' })).toBeVisible()
  await expect(unlock).toHaveCount(0)
  await app.expectHealthy()
})
