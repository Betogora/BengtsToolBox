import { expect, test } from './browserApp'

test('Dashboard startet mit responsiver Navigation', { tag: '@layout' }, async ({ app, page }) => {
  await app.open('/')

  await expect(page.getByRole('heading', { level: 1, name: 'App-Hub' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Scoreboard öffnen' })).toBeVisible()

  const viewportWidth = page.viewportSize()?.width ?? 0
  const mobileNavigation = page.getByRole('button', { name: 'Navigation' })

  if (viewportWidth < 1024) {
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

test('Navigationsmenü öffnet auch nach einem Klick vor dem Nachladen @desktop', async ({ app, page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let releaseMenu = () => {}
  const menuReleased = new Promise<void>((resolve) => {
    releaseMenu = resolve
  })
  await page.route(/\/assets\/NavigationMenu-[\w-]+\.js$/, async (route) => {
    await menuReleased
    await route.continue()
  })
  await app.open('/')

  const navigation = page.getByRole('button', { name: 'Navigation' })
  // Der Austausch des Platzhalters fällt zwischen Drücken und Loslassen.
  await navigation.hover()
  await page.mouse.down()
  releaseMenu()
  await expect(page.getByRole('menuitem', { name: 'App Hub' })).toBeVisible()
  await page.mouse.up()
  await page.keyboard.press('Escape')
  await expect(navigation).toBeFocused()
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

test('Schlag-den-Raab-Passwortfehler ist mit dem Feld verknüpft', async ({
  app,
  page,
}) => {
  await app.open('/schlag-den-raab')

  const passwordInput = page.getByLabel('Passwort')
  await passwordInput.fill('falsch')
  await page.getByRole('button', { name: 'Freischalten' }).click()

  const error = page.getByText('Das Passwort ist nicht korrekt.')
  await expect(error).toBeVisible()
  await expect(error).toHaveAttribute('id', 'schlag-den-raab-password-error')
  await expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
  await expect(passwordInput).toHaveAttribute(
    'aria-describedby',
    'schlag-den-raab-password-error',
  )
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
  await page.keyboard.press('Tab')
  await expect(exitButton).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(exitButton).toBeFocused()
  await app.expectHealthy()

  await page.keyboard.press('Escape')
  await expect(presenter).toBeHidden()
  await expect(presenterTrigger).toBeFocused()
  await app.expectHealthy()
})
