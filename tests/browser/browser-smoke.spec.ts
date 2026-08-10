import { expect, test } from './browserApp'

const progressPlayersStorageKey =
  'app-hub:collection:apps/progress-dashboard/sessions/default/players'
const progressDatasetsStorageKey =
  'app-hub:collection:apps/progress-dashboard/sessions/default/datasets'

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

test('Fortschritts-Dashboard zeigt Diagramm und statische Spieler-Verläufe responsiv', async ({
  app,
  page,
}) => {
  const players = [
    { id: 'person-1', name: 'Damian', position: 1, color: '#facc15' },
    { id: 'person-2', name: 'Jan', position: 2, color: '#0d8e90' },
    { id: 'person-3', name: 'Niggy', position: 3, color: '#fac889' },
    { id: 'person-4', name: 'Eddy', position: 4, color: '#fd7261' },
    { id: 'person-5', name: 'Bengt', position: 5, color: '#385d73' },
  ]
  const eventValues = [
    ['person-1', 'Damian', '#facc15', 4, '2026-08-10T18:00:00.000Z'],
    ['person-2', 'Jan', '#0d8e90', 5, '2026-08-10T18:10:00.000Z'],
    ['person-3', 'Niggy', '#fac889', 2, '2026-08-10T18:20:00.000Z'],
    ['person-4', 'Eddy', '#fd7261', 4, '2026-08-10T18:30:00.000Z'],
    ['person-5', 'Bengt', '#385d73', 3.5, '2026-08-10T18:40:00.000Z'],
    ['person-3', 'Niggy', '#fac889', 4, '2026-08-10T18:50:00.000Z'],
    ['person-2', 'Jan', '#0d8e90', 4.5, '2026-08-10T19:00:00.000Z'],
    ['person-1', 'Damian', '#facc15', 6.5, '2026-08-10T19:10:00.000Z'],
  ]
  const events = eventValues.map(
    ([playerId, playerName, playerColor, valueDelta, createdAtClientIso], index) => ({
      id: `event-${index + 1}`,
      playerId,
      playerName,
      playerColor,
      valueDelta,
      icon: 'plus',
      createdAtClientIso,
      createdAtLabel: createdAtClientIso,
      position: index + 1,
    }),
  )

  await page.addInitScript(
    ({ datasetsKey, events: initialEvents, players: initialPlayers, playersKey }) => {
      window.localStorage.setItem(playersKey, JSON.stringify(initialPlayers))
      window.localStorage.setItem(
        datasetsKey,
        JSON.stringify([
          {
            id: 'dataset-current',
            position: 1,
            name: 'Datensatz',
            chartTitle: 'Getränke-Dashboard',
            unit: 'Getränke',
            status: 'active',
            createdAtClientIso: '2026-08-10T18:00:00.000Z',
            archivedAtClientIso: null,
            events: initialEvents,
          },
        ]),
      )
    },
    {
      datasetsKey: progressDatasetsStorageKey,
      events,
      players,
      playersKey: progressPlayersStorageKey,
    },
  )

  await app.open('/apps/progress-dashboard')

  const chart = page.getByRole('group', { name: 'Getränke-Dashboard' })
  const progressList = page.getByRole('list', { name: 'Topliste' })
  const progressItems = progressList.getByRole('listitem')

  await expect(chart).toBeVisible()
  await expect(progressList).toBeVisible()
  await expect(progressItems).toHaveCount(5)
  await expect(progressItems.nth(0)).toContainText('Damian')
  await expect(progressItems.nth(1)).toContainText('Jan')
  await expect(progressItems.nth(2)).toContainText('Niggy')
  await expect(progressItems.nth(3)).toContainText('Eddy')
  await expect(progressItems.nth(4)).toContainText('Bengt')
  await expect(progressList.locator('[data-progress-variant="detailed"]')).toHaveCount(3)
  await expect(progressList.locator('[data-progress-variant="compact"]')).toHaveCount(2)
  await expect(progressList.getByRole('img')).toHaveCount(5)
  await expect(progressList.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Stand' })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Verlauf' })).toHaveCount(0)
  await expect(progressItems.nth(0).locator('path')).toHaveAttribute('stroke', /#facc15/i)
  await expect(progressItems.nth(3).locator('path')).toHaveAttribute('stroke', /#fd7261/i)

  const chartBounds = await chart.boundingBox()
  const listBounds = await progressList.boundingBox()

  expect(listBounds?.y ?? 0).toBeGreaterThan(
    (chartBounds?.y ?? 0) + (chartBounds?.height ?? 0),
  )
  await app.expectHealthy()
})

test('Fortschritts-Dashboard zeigt Spieler-Verläufe auch ohne Ereignisse', async ({
  app,
  page,
}) => {
  await page.addInitScript(
    ({ datasetsKey, playersKey }) => {
      window.localStorage.setItem(
        playersKey,
        JSON.stringify([
          { id: 'person-1', name: 'Ada', position: 1, color: '#0d8e90' },
          { id: 'person-2', name: 'Bea', position: 2, color: '#fd7261' },
        ]),
      )
      window.localStorage.setItem(
        datasetsKey,
        JSON.stringify([
          {
            id: 'dataset-current',
            position: 1,
            name: 'Datensatz',
            chartTitle: 'Getränke-Dashboard',
            unit: 'Getränke',
            status: 'active',
            createdAtClientIso: '2026-08-10T18:00:00.000Z',
            archivedAtClientIso: null,
            events: [],
          },
        ]),
      )
    },
    {
      datasetsKey: progressDatasetsStorageKey,
      playersKey: progressPlayersStorageKey,
    },
  )

  await app.open('/apps/progress-dashboard')

  const progressList = page.getByRole('list', { name: 'Topliste' })

  await expect(page.getByText('Noch keine Ereignisse im aktuellen Datensatz.')).toBeVisible()
  await expect(progressList.getByRole('listitem')).toHaveCount(2)
  await expect(progressList.locator('[data-progress-variant="detailed"]')).toHaveCount(2)
  await expect(progressList.locator('[data-progress-variant="compact"]')).toHaveCount(0)
  await expect(progressList.getByRole('img')).toHaveCount(2)
  await expect(progressList.getByRole('button')).toHaveCount(0)
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

  const viewportWidth = page.viewportSize()?.width ?? 0

  await page.getByRole('button', { name: 'Sushi-Tourist' }).click()

  if (viewportWidth < 768) {
    const colorPickerBounds = await page
      .getByRole('button', { name: 'Sushi-Tourist 3 Farbe wählen' })
      .boundingBox()
    const playerCardHeight = await page
      .getByRole('button', { name: 'Sushi-Tourist 3 Farbe wählen' })
      .evaluate(
        (button) =>
          button.parentElement?.parentElement?.getBoundingClientRect().height,
      )

    await expect(
      page.getByRole('button', { name: 'Sushi-Tourist 3 entfernen' }),
    ).toHaveCount(0)
    expect(colorPickerBounds?.width).toBeCloseTo(36, 0)
    expect(colorPickerBounds?.height).toBeCloseTo(36, 0)
    expect(playerCardHeight).toBeCloseTo(62, 0)
  }

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

  const germany = page.getByRole('button', { name: /^Deutschland, / })
  await germany.focus()
  await page.keyboard.press('Space')

  const claimDialog = page.getByRole('dialog', { name: 'Deutschland Sushi-bereisen?' })
  await expect(claimDialog).toBeVisible()
  await app.expectHealthy()

  await claimDialog.getByRole('button', { name: 'Nigiri gegessen' }).click()
  await expect(claimDialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Deutschland, Bengt' })).toBeVisible()

  await expect(page.getByRole('table')).toHaveCount(1)

  if (viewportWidth < 768) {
    const scoreTable = page.getByRole('table')
    const scoreContainer = page.locator('[data-slot="table-container"]:visible')
    const scoreOverflow = await scoreContainer.evaluate(
      (container) => container.scrollWidth - container.clientWidth,
    )
    const scoreColumnWidths = await scoreTable.locator('th').evaluateAll(
      (headers) =>
        headers
          .slice(1)
          .map((header) => header.getBoundingClientRect().width),
    )

    expect(scoreOverflow).toBeLessThanOrEqual(1)
    expect(scoreColumnWidths).toHaveLength(3)
    expect(scoreColumnWidths[0]).toBeCloseTo(scoreColumnWidths[1] ?? 0, 0)
    expect(scoreColumnWidths[1]).toBeCloseTo(scoreColumnWidths[2] ?? 0, 0)
  }

  await expect(
    page.locator('[data-dataset-warmed="true"]'),
  ).toHaveCount(1)

  const preparedDateInputs = page.locator('input[type="date"]')
  await expect.poll(() => preparedDateInputs.count()).toBeGreaterThan(0)
  await expect(page.locator('input[type="date"]:visible')).toHaveCount(0)

  await page.getByRole('button', { name: 'Datensatz' }).click()
  const expectedVisibleTables = viewportWidth >= 768 ? 2 : 1
  await expect(page.getByRole('table')).toHaveCount(expectedVisibleTables)

  const dateInput = page.locator('input[type="date"]:visible')

  if (viewportWidth < 768) {
    const playerSelect = page.getByRole('combobox', { name: 'Sushi-Tourist' })
    const territorySelect = page.getByRole('combobox', { name: 'Territorium' })
    const dateBounds = await dateInput.boundingBox()
    const playerBounds = await playerSelect.boundingBox()
    const territoryBounds = await territorySelect.boundingBox()

    expect(dateBounds?.width).toBeCloseTo(playerBounds?.width ?? 0, 0)

    if (viewportWidth < 368) {
      expect(playerBounds?.y).toBeGreaterThan(
        (dateBounds?.y ?? 0) + (dateBounds?.height ?? 0),
      )
    } else {
      expect(dateBounds?.y).toBeCloseTo(playerBounds?.y ?? 0, 0)
    }

    expect(territoryBounds?.y).toBeGreaterThan(
      Math.max(
        (dateBounds?.y ?? 0) + (dateBounds?.height ?? 0),
        (playerBounds?.y ?? 0) + (playerBounds?.height ?? 0),
      ),
    )
  }

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

test('Sushi Map synchronisiert Ansichten und berücksichtigt Lennart', async ({
  app,
  page,
}) => {
  const playersStorageKey =
    'app-hub:collection:apps/territory-map/sessions/default/players'
  const datasetStorageKey =
    'app-hub:collection:apps/territory-map/sessions/default/datasets'

  await page.addInitScript(
    ({ playersKey, datasetKey }) => {
      window.localStorage.setItem(
        playersKey,
        JSON.stringify([
          { id: 'person-1', name: 'Bengt', color: '#0D8E90', position: 1 },
          { id: 'person-2', name: 'Paul', color: '#FD7261', position: 2 },
          { id: 'person-4', name: 'Lennart', color: '#FAC889', position: 4 },
        ]),
      )
      window.localStorage.setItem(
        datasetKey,
        JSON.stringify([
          {
            id: 'dataset-current',
            position: 1,
            name: 'Datensatz',
            status: 'active',
            createdAtClientIso: '2026-07-30T10:00:00.000Z',
            archivedAtClientIso: null,
            events: [
              {
                id: 'event-japan-lennart',
                mapId: 'world',
                territoryId: 'jp',
                territoryName: 'Japan',
                playerId: 'person-4',
                playerName: 'Lennart',
                playerColor: '#FAC889',
                createdAtClientIso: '2026-07-30T10:00:00.000Z',
                createdAtLabel: '2026-07-30T10:00:00.000Z',
                position: 1,
              },
            ],
          },
        ]),
      )
    },
    { playersKey: playersStorageKey, datasetKey: datasetStorageKey },
  )

  await app.open('/apps/sushi')

  const scoreToggle = page.getByRole('button', { name: 'Punktzahl' })
  const achievementsToggle = page.getByRole('button', { name: 'Achievements' })

  await expect(scoreToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('table')).toHaveCount(1)
  await expect(achievementsToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('Land der Sushis')).toHaveCount(0)

  await page.getByRole('button', { name: 'Sushi-Tourist' }).click()
  for (const player of ['Bengt', 'Paul', 'Lennart']) {
    await expect(
      page.getByRole('button', { name: `${player} entfernen` }),
    ).toHaveCount(0)
  }

  const bengtColorPicker = page.getByRole('button', {
    name: 'Bengt Farbe wählen',
  })
  const bengtSwatch = bengtColorPicker.locator('span[aria-hidden="true"]')
  const colorBefore = await bengtSwatch.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )

  await bengtColorPicker.click()
  await page.getByRole('slider').press('ArrowRight')
  await expect
    .poll(() =>
      bengtSwatch.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    )
    .not.toBe(colorBefore)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Sushi-Tourist hinzufügen' }).click()
  const removeFourthPlayer = page.getByRole('button', {
    name: 'Sushi-Tourist 5 entfernen',
  })
  await expect(removeFourthPlayer).toBeVisible()
  await removeFourthPlayer.click()
  await expect(removeFourthPlayer).toHaveCount(0)

  await achievementsToggle.click()
  const japanAchievement = page
    .getByText('Land der Sushis')
    .locator('xpath=ancestor::details')

  await expect(japanAchievement).toContainText('Lennart')
  await scoreToggle.click()
  await expect(page.getByRole('table')).toHaveCount(0)

  await page.getByRole('link', { name: 'BengtsToolBox' }).click()
  await page.getByRole('link', { name: 'Sushi Map öffnen' }).click()

  await expect(
    page.getByRole('button', { name: 'Achievements' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('Land der Sushis').locator('xpath=ancestor::details'))
    .toContainText('Lennart')
  await expect(page.getByRole('button', { name: 'Punktzahl' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(page.getByRole('table')).toHaveCount(0)
  await app.expectHealthy()
})

test('Sushi Map folgt Touch-Panning nach einem Animationsframe', async ({
  app,
  page,
}) => {
  type MapPanTestWindow = typeof window & {
    __territoryMapRafTest?: {
      flush: () => {
        flushed: number
        pending: number
      }
      restore: () => void
    }
  }

  await app.open('/apps/sushi')

  const mapViewport = page.locator('[data-map-dragging]')
  const mapLayer = page.locator('.territory-map-layer')
  const zoomIn = page.getByRole('button', { name: 'Reinzoomen' })
  const touchSession = await page.context().newCDPSession(page)

  await expect(mapViewport).toBeVisible()
  await zoomIn.click()
  await zoomIn.click()
  await zoomIn.click()
  await expect(zoomIn).toBeDisabled()

  const mapBefore = await mapViewport.evaluate((viewport) => {
    const rect = viewport.getBoundingClientRect()
    const layer = viewport.querySelector<SVGGElement>('.territory-map-layer')

    return {
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      transform: layer?.style.transform,
    }
  })

  await page.evaluate(() => {
    const testWindow = window as MapPanTestWindow
    const originalRequestAnimationFrame = window.requestAnimationFrame
    const callbacks: FrameRequestCallback[] = []

    window.requestAnimationFrame = (callback) => {
      callbacks.push(callback)
      return callbacks.length
    }
    testWindow.__territoryMapRafTest = {
      flush: () => {
        const currentCallbacks = callbacks.splice(0)
        currentCallbacks.forEach((callback) => callback(performance.now()))

        return {
          flushed: currentCallbacks.length,
          pending: callbacks.length,
        }
      },
      restore: () => {
        window.requestAnimationFrame = originalRequestAnimationFrame
        delete testWindow.__territoryMapRafTest
      },
    }
  })

  await touchSession.send('Input.dispatchTouchEvent', {
    touchPoints: [{ id: 1, x: mapBefore.startX, y: mapBefore.startY }],
    type: 'touchStart',
  })
  await touchSession.send('Input.dispatchTouchEvent', {
    touchPoints: [{ id: 1, x: mapBefore.startX - 44, y: mapBefore.startY + 36 }],
    type: 'touchMove',
  })

  const frameState = await page.evaluate(
    () => (window as MapPanTestWindow).__territoryMapRafTest?.flush(),
  )
  const transformAfter = await mapLayer.evaluate(
    (layer) => (layer as SVGGElement).style.transform,
  )

  expect(frameState).toEqual({ flushed: 1, pending: 0 })
  expect(transformAfter).not.toBe(mapBefore.transform)

  await touchSession.send('Input.dispatchTouchEvent', {
    touchPoints: [],
    type: 'touchEnd',
  })
  await page.evaluate(() =>
    (window as MapPanTestWindow).__territoryMapRafTest?.restore(),
  )
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await app.expectHealthy()
})

test('Globaler Farbkreis zeigt live an und speichert direkte Änderungen', async ({
  app,
  page,
}, testInfo) => {
  test.setTimeout(90_000)

  const scoreboardRoute = '/apps/scoreboard'
  const appPickers = [
    { route: '/apps/decision-wheel', name: 'Option 1 Farbe wählen' },
    { route: '/apps/progress-dashboard', name: 'Person 1 Farbe wählen' },
    { route: scoreboardRoute, name: null },
    { route: '/apps/sushi', name: 'Bengt Farbe wählen' },
  ]

  for (const picker of appPickers) {
    await app.open(picker.route)

    if (picker.route === '/apps/sushi') {
      await page.getByRole('button', { name: 'Sushi-Tourist' }).click()
    }

    await expect(page.locator('input[type="color"]')).toHaveCount(0)
    const scoreboardPickers = page.locator('button[aria-label^="Farbe für"]')

    if (picker.route === scoreboardRoute) {
      await expect.poll(() => scoreboardPickers.count()).toBeGreaterThan(0)
    }

    const trigger = picker.name
      ? page.getByRole('button', { name: picker.name })
      : scoreboardPickers.first()

    await expect(trigger).toBeVisible()
    await trigger.click()
    await expect(page.getByRole('slider')).toBeVisible()
    await expect(page.getByText('Farbe auswählen', { exact: true })).toHaveCount(0)
    await expect(page.getByText(/^#[0-9A-F]{6}$/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Abbrechen' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Übernehmen' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('slider')).toBeHidden()
  }

  await app.open(scoreboardRoute)
  const colorPickerFrames = page.locator('button[aria-label^="Farbe für"]')

  await expect.poll(() => colorPickerFrames.count()).toBeGreaterThan(1)

  const picker = colorPickerFrames.first()
  const framePaddings = await colorPickerFrames.evaluateAll((frames) =>
    frames.map((frame) => getComputedStyle(frame).paddingTop),
  )

  expect(framePaddings.length).toBeGreaterThan(1)
  expect([...new Set(framePaddings)]).toEqual(['2px'])

  const storedValues = () =>
    page.evaluate(() =>
      Object.entries(window.localStorage)
        .filter(([key]) => key.includes('scoreboard'))
        .sort(([left], [right]) => left.localeCompare(right)),
    )
  const swatch = picker.locator('span[aria-hidden="true"]')
  const readSwatchColor = () =>
    swatch.evaluate((element) => getComputedStyle(element).backgroundColor)
  const storedBeforePointer = await storedValues()
  const swatchBeforePointer = await readSwatchColor()

  await picker.click()
  const wheel = page.getByRole('slider', {
    name: 'Farbkreis: links und rechts ändern den Farbton, oben und unten die Intensität',
  })
  const wheelBounds = await wheel.boundingBox()

  if (!wheelBounds) {
    throw new Error('Der Farbkreis besitzt keine sichtbaren Abmessungen.')
  }

  if (testInfo.project.name === 'desktop') {
    await page.mouse.move(
      wheelBounds.x + wheelBounds.width / 2,
      wheelBounds.y + wheelBounds.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      wheelBounds.x + wheelBounds.width * 0.8,
      wheelBounds.y + wheelBounds.height / 2,
    )
    await expect.poll(readSwatchColor).not.toBe(swatchBeforePointer)
    expect(await storedValues()).toEqual(storedBeforePointer)
    await page.mouse.up()
  } else {
    await wheel.click({
      position: {
        x: wheelBounds.width * 0.8,
        y: wheelBounds.height / 2,
      },
    })
  }

  await expect.poll(readSwatchColor).not.toBe(swatchBeforePointer)
  await expect.poll(storedValues).not.toEqual(storedBeforePointer)
  await expect(wheel).toBeVisible()

  const storedAfterPointer = await storedValues()
  await page.keyboard.press('Escape')
  await expect(wheel).toBeHidden()
  expect(await storedValues()).toEqual(storedAfterPointer)

  const storedBeforeKeyboard = await storedValues()
  await picker.click()
  await wheel.press('ArrowRight')
  await expect.poll(storedValues).not.toEqual(storedBeforeKeyboard)
  await expect(wheel).toBeVisible()
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
