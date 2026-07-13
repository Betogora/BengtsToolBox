import { expect, test } from './browserApp'

test('Dashboard startet mit responsiver Navigation', async ({ app, page }) => {
  await app.open('/')

  await expect(page.getByRole('heading', { level: 1, name: 'App-Hub' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Scoreboard öffnen' })).toBeVisible()

  const viewportWidth = page.viewportSize()?.width ?? 0
  const mobileNavigation = page.getByRole('button', { name: 'Navigation' })

  if (viewportWidth < 768) {
    await expect(mobileNavigation).toBeVisible()
    await mobileNavigation.click()
    await expect(page.getByRole('menuitem', { name: 'App Hub' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(mobileNavigation).toBeFocused()
  } else {
    await expect(mobileNavigation).toBeHidden()
    await expect(page.getByRole('link', { name: 'App Hub', exact: true })).toBeVisible()
  }

  await app.expectHealthy()
})

test('verschachtelte Scoreboard-Route unterstützt Aktion und Dialog per Tastatur', async ({
  app,
  page,
}) => {
  await app.open('/lobbies/default/apps/scoreboard')

  await expect(page.getByRole('heading', { level: 1, name: 'Scoreboard' })).toBeVisible()

  const incrementButton = page.getByRole('button', {
    name: 'Spieler 1 einen Punkt hinzufügen',
  })
  await incrementButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('+1 Punkte gebucht.')).toBeVisible()

  const archiveTrigger = page.getByRole('button', {
    name: 'Archivieren und neu starten',
    exact: true,
  })
  await expect(archiveTrigger).toBeEnabled()
  await archiveTrigger.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', {
    name: 'Scoring archivieren und neu starten?',
  })
  const confirmButton = dialog.getByRole('button', {
    name: 'Archivieren und neu starten',
    exact: true,
  })

  await expect(dialog).toBeVisible()
  await expect(confirmButton).toBeFocused()
  await app.expectHealthy()

  await page.keyboard.press('Tab')
  await expect
    .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(archiveTrigger).toBeFocused()
  await app.expectHealthy()
})

test('Presenter bleibt read-only und stellt den Fokus wieder her', async ({ app, page }) => {
  await app.open('/apps/coinflip')

  const presenterTrigger = page.getByRole('button', { name: 'Presenter', exact: true })
  await presenterTrigger.focus()
  await page.keyboard.press('Enter')

  const presenter = page.getByRole('dialog', { name: 'Coinflip Presenter' })
  const exitButton = presenter.getByRole('button', { name: 'Presenter beenden' })

  await expect(presenter).toBeVisible()
  await expect(exitButton).toBeFocused()
  await expect(presenter.getByRole('button')).toHaveCount(1)
  await app.expectHealthy()

  await page.keyboard.press('Escape')
  await expect(presenter).toBeHidden()
  await expect(presenterTrigger).toBeFocused()
  await app.expectHealthy()
})

test('Sushi Map unterstützt Karten-, Dialog- und Tabellenfluss responsiv', async ({
  app,
  page,
}) => {
  await app.open('/apps/sushi')

  await expect(page.getByRole('heading', { level: 1, name: 'Sushi Map' })).toBeVisible()

  const zoomIn = page.getByRole('button', { name: 'Reinzoomen' })
  const zoomOut = page.getByRole('button', { name: 'Rauszoomen' })
  await expect(zoomOut).toBeDisabled()
  await zoomIn.click()
  await expect(zoomOut).toBeEnabled()

  const germany = page.getByRole('button', { name: /^Deutschland, / })
  await germany.focus()
  await page.keyboard.press('Space')

  const claimDialog = page.getByRole('dialog', { name: 'Deutschland Sushi-bereisen?' })
  await expect(claimDialog).toBeVisible()
  await app.expectHealthy()

  await claimDialog.getByRole('button', { name: 'Nigiri gegessen' }).click()
  await expect(claimDialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Deutschland, Bengt' })).toBeVisible()

  await page.getByRole('button', { name: 'Punktzahl' }).click()
  await expect(page.getByRole('table')).toHaveCount(1)

  await page.getByRole('button', { name: 'Datensatz' }).click()
  const expectedVisibleTables = (page.viewportSize()?.width ?? 0) >= 768 ? 2 : 1
  await expect(page.getByRole('table')).toHaveCount(expectedVisibleTables)
  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await app.expectHealthy()
})
