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

  for (const territory of ['England', 'Nordirland', 'Schottland', 'Wales']) {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${territory}, `) }),
    ).toBeVisible()
  }
  await expect(
    page.getByRole('button', { name: /^Vereinigtes Königreich, / }),
  ).toHaveCount(0)

  const zoomIn = page.getByRole('button', { name: 'Reinzoomen' })
  const zoomOut = page.getByRole('button', { name: 'Rauszoomen' })
  const mapSelector = page.getByRole('group', { name: 'Karte' })
  const selectorBounds = await mapSelector.boundingBox()
  const zoomBounds = await zoomIn.boundingBox()

  expect(selectorBounds?.height).toBeCloseTo(zoomBounds?.height ?? 0, 0)
  await expect(zoomOut).toBeDisabled()
  await zoomIn.click()
  await expect(zoomOut).toBeEnabled()
  await zoomIn.click()
  await zoomIn.click()
  await expect(zoomIn).toBeDisabled()
  await expect(page.locator('.territory-map-layer')).toHaveAttribute(
    'transform',
    /scale\(8\)/,
  )

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

  const dateInput = page.locator('input[type="date"]:visible')
  const storedDatasets = () =>
    page.evaluate(() => {
      const key = Object.keys(window.localStorage).find((entry) =>
        entry.endsWith('/datasets'),
      )

      return key ? window.localStorage.getItem(key) : null
    })
  const storedBeforeDateEdit = await storedDatasets()

  await dateInput.fill('2024-01-02')
  await expect(dateInput).toHaveValue('2024-01-02')
  expect(await storedDatasets()).toBe(storedBeforeDateEdit)

  await dateInput.press('Enter')
  await expect(dateInput).not.toBeFocused()
  await expect.poll(storedDatasets).not.toBe(storedBeforeDateEdit)

  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await app.expectHealthy()
})

test('Globaler Farbkreis speichert erst bestätigte Änderungen', async ({
  app,
  page,
}) => {
  const appPickers = [
    { route: '/apps/decision-wheel', name: 'Option 1 Farbe wählen' },
    { route: '/apps/progress-dashboard', name: 'Person 1 Farbe wählen' },
    { route: '/apps/scoreboard', name: 'Farbe für Spieler 1' },
    { route: '/apps/sushi', name: 'Bengt Farbe wählen' },
  ]

  for (const picker of appPickers) {
    await app.open(picker.route)

    if (picker.route === '/apps/sushi') {
      await page.getByRole('button', { name: 'Sushi-Tourist' }).click()
    }

    await expect(page.locator('input[type="color"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: picker.name })).toBeVisible()
  }

  await app.open('/apps/scoreboard')
  const picker = page.getByRole('button', { name: 'Farbe für Spieler 1' })
  const storedValues = () =>
    page.evaluate(() =>
      Object.entries(window.localStorage)
        .filter(([key]) => key.includes('scoreboard'))
        .sort(([left], [right]) => left.localeCompare(right)),
    )
  const storedBeforeOpen = await storedValues()

  await picker.click()
  const wheel = page.getByRole('slider', {
    name: 'Farbkreis: links und rechts ändern den Farbton, oben und unten die Intensität',
  })
  await wheel.press('ArrowRight')
  expect(await storedValues()).toEqual(storedBeforeOpen)
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  expect(await storedValues()).toEqual(storedBeforeOpen)

  await picker.click()
  await wheel.press('ArrowRight')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect.poll(storedValues).not.toEqual(storedBeforeOpen)
  await app.expectHealthy()
})

test('Sushi Map zeigt alle Owner kleiner Territorien mit adaptiven Streifen', async ({
  app,
  page,
}) => {
  const datasetStorageKey =
    'app-hub:collection:apps/territory-map/sessions/default/datasets'

  await page.addInitScript(
    ({ key }) => {
      const events = [
        ['person-1', 'Bengt', '#0D8E90'],
        ['person-2', 'Paul', '#FD7261'],
        ['person-3', 'Sushi-Tourist 3', '#FAC889'],
      ].map(([playerId, playerName, playerColor], index) => ({
        id: `event-northern-ireland-${index + 1}`,
        mapId: 'world',
        territoryId: 'gb-nir',
        territoryName: 'Nordirland',
        playerId,
        playerName,
        playerColor,
        createdAtClientIso: `2026-07-01T10:0${index}:00.000Z`,
        createdAtLabel: `2026-07-01T10:0${index}:00.000Z`,
        position: index + 1,
      }))

      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            id: 'dataset-current',
            position: 1,
            name: 'Datensatz',
            status: 'active',
            createdAtClientIso: '2026-07-01T10:00:00.000Z',
            archivedAtClientIso: null,
            events,
          },
        ]),
      )
    },
    { key: datasetStorageKey },
  )

  await app.open('/apps/sushi')
  await expect(
    page.getByRole('button', { name: 'Nordirland, Bengt, Paul, Sushi-Tourist 3' }),
  ).toBeVisible()

  const readStripeMetrics = () =>
    page.evaluate(() => {
      const path = document.querySelector<SVGPathElement>(
        '[data-territory-id="gb-nir"]',
      )
      const pattern = document.querySelector<SVGPatternElement>(
        '#territory-shared-gb-nir',
      )

      if (!path || !pattern) {
        return null
      }

      const screenBounds = path.getBoundingClientRect()
      const svgBounds = path.getBBox()
      const screenProjection =
        (screenBounds.width + screenBounds.height) / Math.SQRT2
      const svgProjection = (svgBounds.width + svgBounds.height) / Math.SQRT2
      const stripeWidth = Number(pattern.dataset.stripeWidth)
      const colors = [...pattern.querySelectorAll('rect')].map((rect) =>
        rect.getAttribute('fill'),
      )

      return {
        colors,
        cycleWidth: stripeWidth * colors.length,
        screenStripeWidth: stripeWidth * (screenProjection / svgProjection),
        svgProjection,
      }
    })

  for (let zoomIndex = 0; zoomIndex < 4; zoomIndex += 1) {
    await expect.poll(readStripeMetrics).not.toBeNull()
    const currentMetrics = await readStripeMetrics()

    expect(new Set(currentMetrics?.colors).size).toBe(3)
    expect(currentMetrics?.screenStripeWidth).toBeLessThanOrEqual(3.05)
    expect(currentMetrics?.cycleWidth).toBeLessThanOrEqual(
      (currentMetrics?.svgProjection ?? 0) + 0.01,
    )

    if (zoomIndex < 3) {
      await page.getByRole('button', { name: 'Reinzoomen' }).click()
    }
  }

  await app.expectHealthy()
})

test('Sushi Map migriert UK-Altbesuche lobbyweise zu England', async ({
  app,
  page,
}) => {
  const datasetStorageKey =
    'app-hub:collection:apps/territory-map/sessions/default/datasets'

  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            id: 'dataset-current',
            position: 1,
            name: 'Datensatz',
            status: 'active',
            createdAtClientIso: '2026-06-03T15:33:11.470Z',
            archivedAtClientIso: null,
            events: [
              {
                id: 'event-uk',
                mapId: 'world',
                territoryId: 'gb',
                territoryName: 'Vereinigtes Königreich',
                playerId: 'person-2',
                playerName: 'Paul',
                playerColor: '#a24a02',
                createdAtClientIso: '2026-06-04T14:46:48.421Z',
                createdAtLabel: '2026-06-04T14:46:48.421Z',
                position: 1,
              },
            ],
          },
        ]),
      )
    },
    { key: datasetStorageKey },
  )

  await app.open('/apps/sushi')

  await expect(page.getByRole('button', { name: 'England, Paul' })).toBeVisible()
  await expect.poll(() => page.evaluate((key) => {
    const stored = window.localStorage.getItem(key) ?? ''

    return {
      hasEngland: stored.includes('"territoryId":"gb-eng"'),
      hasLegacy: stored.includes('"territoryId":"gb"'),
    }
  }, datasetStorageKey)).toEqual({
    hasEngland: true,
    hasLegacy: false,
  })
  await app.expectHealthy()
})
