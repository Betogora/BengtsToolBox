import { expect, test } from './browserApp'

test('Triathlon-Tracker erfasst Plan und Training auf allen Viewports', async ({
  app,
  page,
}) => {
  await app.open('/apps/triathlon-tracker')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Triathlon-Tracker' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /Eintrag für .* hinzufügen/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Training eintragen' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Einstellungen' })).toHaveCount(0)
  await expect(page.getByText('Lokaler Modus')).toHaveCount(0)
  await expect(page.getByText('Kommende Planungen')).toHaveCount(0)
  await expect(page.getByText('0 von 3 geeigneten Trainings', { exact: true })).toHaveCount(2)
  await expect(page.getByText('0 von 1 geeigneten Trainings', { exact: true })).toHaveCount(1)
  await expect(page.getByRole('combobox', { name: 'Schwimmen' })).toContainText('50-m-Becken')
  expect(await page.locator('[data-performance-card]').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-performance-card')),
  )).toEqual(['swim', 'bike', 'run'])
  const viewport = page.viewportSize()
  const summaryWidths = await page.locator('[data-week-summary-item]').evaluateAll((items) =>
    items.map((item) => Math.round(item.getBoundingClientRect().width)),
  )
  expect(summaryWidths).toHaveLength(4)
  expect(Math.max(...summaryWidths) - Math.min(...summaryWidths)).toBeLessThanOrEqual(1)
  const disciplineColors = await page.locator('[data-discipline-summary] svg').evaluateAll((icons) =>
    icons.map((icon) => getComputedStyle(icon).color),
  )
  expect(new Set(disciplineColors).size).toBe(3)
  if (viewport && viewport.width < 1024) {
    await expect(page.getByRole('button', { name: 'Navigation' })).toBeVisible()
  } else {
    await expect(page.locator('[data-current-week="true"]:visible')).toHaveCount(1)
  }
  const visibleCalendarDays = page.locator('[data-calendar-date]:visible')
  await expect(visibleCalendarDays.first()).toBeVisible()
  const dayHeights = await visibleCalendarDays.evaluateAll((days) =>
    days.map((day) => Math.round(day.getBoundingClientRect().height)),
  )
  expect(new Set(dayHeights).size).toBe(1)
  if (viewport && viewport.width < 640) {
    expect(dayHeights[0]).toBeLessThanOrEqual(112)
    await page.getByRole('button', { name: 'Monat', exact: true }).click()
    await expect(page.locator('[data-calendar-date]:visible')).toHaveCount(1)
    await expect(page.locator('[aria-current="date"][aria-pressed="true"]')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(5_000)
    await page.getByRole('button', { name: 'Woche', exact: true }).click()
  } else if (viewport && viewport.width < 1024) {
    await expect(visibleCalendarDays).toHaveCount(1)
    await expect(page.locator('[aria-current="date"][aria-pressed="true"]')).toBeVisible()
  }

  const calendarControlHeights = await Promise.all(
    ['Monat', 'Woche', 'Woche kopieren', 'Zurück', 'Heute', 'Weiter'].map(
      (name) => page.getByRole('button', { name, exact: true })
        .evaluate((button) => Math.round(button.getBoundingClientRect().height)),
    ),
  )
  expect(new Set(calendarControlHeights).size).toBe(1)
  await app.expectHealthy()

  const todayLocalDate = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Europe/Berlin',
      year: 'numeric',
    }).formatToParts(new Date())
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  })

  await page.getByRole('button', { name: 'Training eintragen' }).click()
  const actualDialog = page.getByRole('dialog', { name: 'Training eintragen' })
  await expect(actualDialog).toBeVisible()
  await expect(actualDialog.getByRole('combobox', { name: 'Kontext' })).toContainText(
    'Straße',
  )
  await actualDialog.getByRole('combobox', { name: 'Disziplin' }).click()
  await page.getByRole('option', { name: 'Schwimmen' }).click()
  await expect(actualDialog.getByRole('combobox', { name: 'Kontext' })).toContainText(
    '50-m-Becken',
  )
  await actualDialog.getByRole('combobox', { name: 'Disziplin' }).click()
  await page.getByRole('option', { name: 'Laufen' }).click()
  const moreDetails = actualDialog.getByRole('button', { name: 'Weitere Angaben' })
  await expect(moreDetails).toHaveAttribute('aria-expanded', 'false')
  await expect(actualDialog.getByLabel('Ø Herzfrequenz (bpm)')).toBeVisible()
  await expect(actualDialog.getByLabel('Ø Leistung (W)')).toHaveCount(0)
  await moreDetails.click()
  await expect(actualDialog.getByLabel('Ø Leistung (W)')).toBeVisible()
  await moreDetails.click()
  await expect(actualDialog.getByRole('button', { name: 'Speichern' })).toBeVisible()
  await app.expectHealthy()

  await actualDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(actualDialog.getByRole('alert')).toContainText(
    'Trage mindestens Dauer oder Distanz ein.',
  )

  await actualDialog.getByLabel('Dauer (min)').fill('45')
  await actualDialog.getByLabel('Distanz (km)').fill('10')
  await actualDialog.getByLabel('Ø Herzfrequenz (bpm)').fill('155')
  await expect(actualDialog.getByLabel('Ø Pace (min/km)')).toHaveValue('4:30')
  await actualDialog.getByLabel('Ø Pace (min/km)').fill('5:00')
  await expect(actualDialog.getByLabel('Dauer (min)')).toHaveValue('50')
  await actualDialog.getByRole('button', { name: 'Speichern' }).click()

  await expect(page.getByText('Training gespeichert.')).toBeVisible()
  await expect(page.locator('[data-recent-training-metrics]:visible')).toContainText(
    '50 min · 10 km · 5:00 min/km',
  )
  await expect(page.getByText('1 passendes Training')).toBeVisible()

  const todayCalendarDay = page.locator(`[data-calendar-date="${todayLocalDate}"]:visible`)
  const trainingCardHeight = await todayCalendarDay
    .getByRole('button', { name: 'Laufen Ist 50 min · 10 km' })
    .evaluate((button) => Math.round(button.getBoundingClientRect().height))
  const addCardHeight = await todayCalendarDay
    .getByRole('button', { name: /Eintrag für .* hinzufügen/ })
    .evaluate((button) => Math.round(button.getBoundingClientRect().height))
  expect(trainingCardHeight).toBe(addCardHeight)

  await page.getByRole('button', { name: 'Laufen Ist 50 min · 10 km' }).click()
  const editDialog = page.getByRole('dialog', { name: 'Training bearbeiten' })
  await expect(editDialog.getByLabel('Ø Herzfrequenz (bpm)')).toHaveValue('155')
  await editDialog.getByLabel('Dauer (min)').fill('45')
  await expect(editDialog.getByLabel('Ø Pace (min/km)')).toHaveValue('4:30')
  await editDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.locator('[data-recent-training-metrics]:visible')).toContainText(
    '45 min · 10 km · 4:30 min/km',
  )

  await page.locator(`[data-calendar-date="${todayLocalDate}"]:visible`)
    .getByRole('button', { name: /Eintrag für .* hinzufügen/ })
    .click()
  const plannedDialog = page.getByRole('dialog', { name: 'Plan hinzufügen' })
  await plannedDialog.getByLabel('Kurzes Label').fill('Lockerer Lauf')
  await plannedDialog.getByLabel('Dauer (min)').fill('30')
  await plannedDialog.getByRole('button', { name: 'Speichern' }).click()

  await expect(page.getByText('Planung gespeichert.')).toBeVisible()
  await expect(page.locator('span:visible', { hasText: 'Lockerer Lauf' }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Woche kopieren' }).click()
  const copyDialog = page.getByRole('dialog', {
    name: 'Trainingswoche kopieren',
  })
  await expect(copyDialog).toContainText('1 Planungen werden kopiert.')
  const sourceWeek = copyDialog.getByLabel('Quellwoche')
  const sourceWeekValue = await sourceWeek.inputValue()
  await sourceWeek.fill('')
  await expect(copyDialog.getByRole('alert')).toContainText(
    'Bitte wähle eine gültige Quell- und Zielwoche.',
  )
  await app.expectHealthy()
  await sourceWeek.fill(sourceWeekValue)
  await copyDialog.getByRole('button', { name: '1 Planungen kopieren' }).click()
  await expect(page.getByText('1 Planungen kopiert.')).toBeVisible()

  await page.getByRole('button', { name: 'Woche', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Woche', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.getByRole('button', { name: 'Laufen Ist 45 min · 10 km' }).click()
  await page.getByRole('dialog', { name: 'Training bearbeiten' })
    .getByRole('button', { name: 'Löschen' })
    .click()
  const deleteDialog = page.getByRole('dialog', { name: 'Training löschen?' })
  await deleteDialog.getByRole('button', { name: 'Bestätigen' }).click()
  await expect(page.getByText('Training gelöscht.')).toBeVisible()
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 6_000 })
  await app.expectHealthy()
})

test('Triathlon-Tracker zeigt Modelle und Aktivitätspunkte zugänglich an', async ({
  app,
  page,
}) => {
  await page.addInitScript(() => {
    const actualKey =
      'app-hub:collection:apps/triathlon-tracker/sessions/default/actual-trainings'
    const settingsKey =
      'app-hub:doc:apps/triathlon-tracker/sessions/default/state/default'
    const localDate = (daysAgo: number) => {
      const date = new Date()
      date.setUTCDate(date.getUTCDate() - daysAgo)
      const parts = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Europe/Berlin',
        year: 'numeric',
      }).formatToParts(date)
      const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
      )
      return `${values.year}-${values.month}-${values.day}`
    }
    const activity = (
      id: string,
      position: number,
      discipline: 'swim' | 'bike' | 'run',
      context: string | null,
      durationSeconds: number,
      distanceMeters: number,
      averagePowerWatts: number | null = null,
    ) => {
      const date = localDate(12 - position)
      return {
        id,
        position,
        analyticsAvailableFromLocalDate: date,
        localDate: date,
        startMinutes: null,
        discipline,
        context,
        durationSeconds,
        distanceMeters,
        averageHeartRateBpm: null,
        averagePowerWatts,
        rpe: null,
        intervals: [],
      }
    }
    const cp = 250
    const workCapacity = 20_000
    const bike = [180, 600, 1_200].map((duration, index) =>
      activity(
        `bike-${index + 1}`,
        index + 7,
        'bike',
        'outdoor',
        duration,
        duration * 10,
        cp + workCapacity / duration,
      ),
    )
    const trainings = [
      activity('run-1', 1, 'run', 'road', 300, 1_400),
      activity('run-2', 2, 'run', 'road', 600, 2_600),
      activity('run-3', 3, 'run', 'road', 1_200, 5_000),
      activity('swim-1', 4, 'swim', 'pool-50', 120, 200),
      activity('swim-2', 5, 'swim', 'pool-50', 260, 400),
      activity('swim-3', 6, 'swim', 'pool-50', 520, 750),
      ...bike,
      activity('legacy-run', 10, 'run', null, 840, 3_000),
    ]

    window.localStorage.setItem(actualKey, JSON.stringify(trainings))
    window.localStorage.setItem(
      settingsKey,
      JSON.stringify({
        schemaVersion: 1,
        weightKg: 80,
      }),
    )
  })

  await app.open('/apps/triathlon-tracker')

  await expect(page.getByLabel('Aktuelles Gewicht (kg)')).toHaveValue('80')
  await page.getByLabel('Aktuelles Gewicht (kg)').fill('79.5')
  await page.getByLabel('Aktuelles Gewicht (kg)').blur()
  await expect(page.getByText('Gewicht gespeichert.')).toBeVisible()
  await expect(page.getByText(/W\/kg/)).toBeVisible()
  await expect(page.getByText(/Laufen 10 km:/)).toBeVisible()
  await expect(page.getByText(/Schwimmen 1\.500 m:/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Distanz pro Woche' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('[data-weekly-volume] [role="group"] button')).toHaveText([
    'Distanz pro Woche',
    'Zeit pro Woche',
  ])
  await expect(page.locator('[data-performance-card="swim"]')).not.toContainText('50-m-Becken')
  await expect(page.locator('[data-performance-card="bike"]')).not.toContainText('Outdoor')
  await expect(page.locator('[data-performance-card="run"]')).not.toContainText('Straße')
  await expect(page.locator('[data-weekly-volume] details')).toHaveCount(0)
  await page.getByRole('button', { name: '4W' }).click()

  const firstPerformanceTable = page
    .locator('details:visible')
    .filter({ hasText: 'Daten als Tabelle anzeigen' })
    .first()
  await firstPerformanceTable.locator('summary').click()
  await expect(
    firstPerformanceTable.getByRole('cell', { name: 'Ist', exact: true }),
  ).toHaveCount(4)
  await expect(firstPerformanceTable).toContainText('Modell')
  await page.locator('button:visible[aria-label="Bearbeiten: Laufen"]').first().click()
  await expect(
    page.getByRole('dialog', { name: 'Training bearbeiten' })
      .getByRole('combobox', { name: 'Kontext' }),
  ).toContainText('Straße')
  await app.expectHealthy()
})
