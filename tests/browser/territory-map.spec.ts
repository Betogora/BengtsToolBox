import { expect, test } from './browserApp'

test('Sushi Map unterstützt Karten-, Dialog- und Tabellenfluss responsiv', async ({
  app,
  page,
}) => {
  const geometryRequests: string[] = []
  page.on('request', (request) => {
    if (/\/(world|germany)Territories/.test(request.url())) {
      geometryRequests.push(request.url())
    }
  })
  const germanyGeometryLoaded = page.waitForResponse((response) =>
    response.url().includes('/germanyTerritories'),
  )
  await app.open('/apps/sushi')

  await expect(page.getByRole('heading', { level: 1, name: 'Sushi Map' })).toBeVisible()
  await expect(page.locator('input[aria-label="Datum"]')).toHaveCount(0)
  await germanyGeometryLoaded
  await page.getByRole('radio', { name: 'Deutschland', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Bayern, / })).toBeVisible()
  await page.getByRole('radio', { name: 'Welt', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Japan, / })).toBeVisible()
  expect(geometryRequests.filter((url) => url.includes('/worldTerritories'))).toHaveLength(1)
  expect(geometryRequests.filter((url) => url.includes('/germanyTerritories'))).toHaveLength(1)

  for (const territory of ['England', 'Nordirland', 'Schottland', 'Wales']) {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${territory}, `) }),
    ).toBeVisible()
  }
  await expect(
    page.getByRole('button', { name: /^Vereinigtes Königreich, / }),
  ).toHaveCount(0)

  const viewportWidth = page.viewportSize()?.width ?? 0

  await page.getByRole('button', { name: 'Touristen bearbeiten' }).click()

  if (viewportWidth < 768) {
    const colorPickerBounds = await page
      .getByRole('button', { name: 'Sushi-Tourist 3 Farbe wählen' })
      .boundingBox()

    await expect(
      page.getByRole('button', { name: 'Sushi-Tourist 3 entfernen' }),
    ).toHaveCount(0)
    expect(colorPickerBounds?.width).toBeCloseTo(24, 0)
    expect(colorPickerBounds?.height).toBeCloseTo(24, 0)
  }
  await page.getByRole('button', { name: 'Fertig' }).click()

  const zoomIn = page.getByRole('button', { name: 'Reinzoomen' })
  const zoomOut = page.getByRole('button', { name: 'Rauszoomen' })
  const mapSelector = page.getByRole('radiogroup', { name: 'Karte' })
  const selectorBounds = await mapSelector.boundingBox()
  const zoomBounds = await zoomIn.boundingBox()

  expect(selectorBounds?.height).toBeCloseTo(zoomBounds?.height ?? 0, 0)
  await expect(zoomOut).toBeDisabled()
  await zoomIn.click()
  await expect(zoomOut).toBeEnabled()

  while (await zoomIn.isEnabled()) {
    await zoomIn.click()
  }

  await expect(zoomIn).toBeDisabled()

  const monacoBounds = await page
    .getByRole('button', { name: /^Monaco, / })
    .evaluate((territory) => {
      const bounds = territory.getBoundingClientRect()

      return { height: bounds.height, width: bounds.width }
    })

  expect(monacoBounds.width).toBeGreaterThanOrEqual(24)
  expect(monacoBounds.height).toBeGreaterThanOrEqual(24)

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
    expect(scoreColumnWidths[2]).toBeGreaterThanOrEqual(scoreColumnWidths[1] ?? 0)
  }

  await expect(page.locator('input[aria-label="Datum"]')).toHaveCount(0)

  const historyOpening = await page.getByRole('button', { name: 'Datensatz' }).evaluate(async (button) => {
    button.click()
    await Promise.resolve()
    const card = button.closest('[data-slot="card"]')
    return {
      isExpanded: button.getAttribute('aria-expanded'),
      isLoading: Boolean(card?.querySelector('[role="status"]')),
      dateInputs: card?.querySelectorAll('input[aria-label="Datum"]').length,
    }
  })
  expect(historyOpening).toEqual({ isExpanded: 'true', isLoading: true, dateInputs: 0 })
  const expectedVisibleTables = viewportWidth >= 768 ? 2 : 1
  await expect(page.getByRole('table')).toHaveCount(expectedVisibleTables)

  const dateInput = page.locator('input[aria-label="Datum"]:visible')

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
  await expect(dateInput).toHaveValue('02.01.2024')
  await expect(dateInput).not.toBeFocused()
  await expect.poll(storedDatasets).not.toBe(storedBeforeDateEdit)

  const committedDataset = await storedDatasets()
  await dateInput.fill('2026-02-29')
  await dateInput.press('Tab')
  expect(await storedDatasets()).toBe(committedDataset)
  await dateInput.fill('2025-01-01')
  await dateInput.press('Escape')
  await expect(dateInput).toHaveValue('02.01.2024')
  expect(await storedDatasets()).toBe(committedDataset)
  await page.getByRole('button', { name: 'Kalender öffnen: Datum' }).filter({ visible: true }).click()
  await page.locator('[data-date-picker]').getByRole('button', { name: 'Heute', exact: true }).click()
  await expect.poll(storedDatasets).not.toBe(committedDataset)

  const historyPlayer = page.getByRole('combobox', { name: 'Sushi-Tourist', exact: true })
  await expect(historyPlayer).toContainText('Bengt')
  await historyPlayer.focus()
  await historyPlayer.press('p')
  await expect(historyPlayer).toContainText('Paul')
  await historyPlayer.click()
  await page.getByRole('option', { name: 'Bengt', exact: true }).click()
  await expect(historyPlayer).toContainText('Bengt')

  const historyTerritory = page.getByRole('combobox', { name: 'Territorium', exact: true })
  await expect(historyTerritory).toContainText('Deutschland')
  await historyTerritory.click()
  await page.getByRole('option', { name: 'Japan', exact: true }).click()
  await expect(historyTerritory).toContainText('Japan')
  await expect.poll(storedDatasets).toContain('"territoryId":"jp"')

  const retainedDateInput = await dateInput.elementHandle()
  const savedDate = await dateInput.inputValue()
  await page.getByRole('button', { name: 'Datensatz' }).click()
  await expect(page.locator('input[aria-label="Datum"]:visible')).toHaveCount(0)
  await page.getByRole('radio', { name: 'Deutschland', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Bayern, / })).toBeVisible()
  await page.getByRole('radio', { name: 'Welt', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Japan, / })).toBeVisible()
  await page.getByRole('button', { name: 'Datensatz' }).click()
  await expect(dateInput).toHaveValue(savedDate)
  expect(await retainedDateInput?.isVisible()).toBe(true)

  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await app.expectHealthy()
})

test('Sushi Map synchronisiert Ansichten und berücksichtigt Lennart', { tag: '@desktop' }, async ({
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
  const achievementsToggle = page.getByRole('button', { name: 'Erfolge' })

  await expect(scoreToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('table')).toHaveCount(1)
  await expect(achievementsToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('Land der Sushis')).toHaveCount(0)

  await page.getByRole('button', { name: 'Touristen bearbeiten' }).click()
  await expect(page.getByRole('columnheader', { name: 'Gesamt' })).toBeVisible()
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
  await page.getByRole('button', { name: 'Fertig' }).click()
  await expect(
    page.getByRole('button', { name: 'Sushi-Tourist hinzufügen' }),
  ).toHaveCount(0)

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
    page.getByRole('button', { name: 'Erfolge' }),
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

test('Sushi Map folgt Touch-Panning nach einem Animationsframe', { tag: '@touch' }, async ({
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
  const zoomOut = page.getByRole('button', { name: 'Rauszoomen' })
  const touchSession = await page.context().newCDPSession(page)

  await expect(mapViewport).toBeVisible()
  await zoomIn.click()
  await zoomIn.click()
  await zoomIn.click()
  await expect(zoomOut).toBeEnabled()

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
  await expect.poll(() => mapLayer.evaluate(
    (layer) => (layer as SVGGElement).style.transform,
  )).toBe(transformAfter)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('radiogroup', { name: 'Karte' })
    .getByRole('radio', { name: 'Deutschland', exact: true }).click()
  await expect(zoomOut).toBeDisabled()
  await expect.poll(() => mapLayer.evaluate(
    (layer) => (layer as SVGGElement).style.transform,
  )).toBe('translate(0px, 0px) scale(1)')

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

test('Sushi Map migriert UK-Altbesuche lobbyweise zu England', { tag: '@desktop' }, async ({
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
