import { expect, test } from './browserApp'

test('Plan, Tagebuch und Statistik bleiben getrennt und Trainings sind bearbeitbar', async ({
  app,
  page,
}) => {
  test.setTimeout(150_000)
  await app.open('/apps/triathlon-tracker')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Triathlon-Tracker' }),
  ).toBeVisible()
  await expect(
    page.getByRole('tab', { name: 'Rekorde', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Planung', exact: true }).click()
  await expect(
    page.getByRole('tab', { name: 'Planung', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(
    page.getByRole('heading', { name: 'Leistungsentwicklung' }),
  ).toHaveCount(0)
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()

  await page
    .getByRole('button', { name: 'Plan hinzufügen', exact: true })
    .click()
  const plan = page.getByRole('dialog', { name: 'Plan hinzufügen' })
  const dateInput = plan.getByLabel('Datum', { exact: true })
  const toLocalDate = (value: string) =>
    /^\d{2}\.\d{2}\.\d{4}$/.test(value)
      ? value.split('.').reverse().join('-')
      : value
  const originalDate = toLocalDate(await dateInput.inputValue())
  const calendarButton = plan.getByRole('button', {
    name: 'Kalender öffnen: Datum',
  })
  await calendarButton.click()
  const calendar = page.locator('[data-date-picker]')
  const initialDay = calendar.locator(`[data-picker-date="${originalDate}"]`)
  await expect(initialDay).toBeFocused()
  await initialDay.press('ArrowRight')
  await expect(
    calendar.locator('[data-picker-date]:focus'),
  ).not.toHaveAttribute('data-picker-date', originalDate)
  await calendar.locator('[data-picker-date]:focus').press('PageUp')
  await expect(calendar.getByRole('grid')).toBeVisible()
  await calendar.press('Escape')
  await expect(calendarButton).toBeFocused()
  await calendarButton.click()
  await calendar.getByRole('combobox', { name: 'Monat', exact: true }).click()
  await page.getByRole('option', { name: 'Februar', exact: true }).click()
  await calendar.getByLabel('Jahr', { exact: true }).fill('2024')
  await calendar.getByLabel('Jahr', { exact: true }).press('Tab')
  await calendar.locator('[data-picker-date="2024-02-29"]').click()
  await expect(dateInput).toHaveValue('29.02.2024')
  await dateInput.fill('2025-02-29')
  expect(
    await dateInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity(),
    ),
  ).toBe(false)
  await calendarButton.click()
  await calendar.getByRole('button', { name: 'Heute', exact: true }).click()
  expect(
    await dateInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity(),
    ),
  ).toBe(true)
  await dateInput.fill(originalDate)
  const timeInput = plan.getByLabel('Uhrzeit (optional)', { exact: true })
  await timeInput.fill('24:61')
  expect(
    await timeInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity(),
    ),
  ).toBe(false)
  await plan
    .getByRole('button', { name: 'Uhrzeit wählen: Uhrzeit (optional)' })
    .click()
  const timePicker = page.locator('[data-time-picker]')
  await timePicker.getByRole('button', { name: '06:00', exact: true }).click()
  expect(
    await timeInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity(),
    ),
  ).toBe(true)
  await plan
    .getByRole('button', { name: 'Uhrzeit wählen: Uhrzeit (optional)' })
    .click()
  await timePicker.getByLabel('Stunden', { exact: true }).fill('23')
  await timePicker.getByLabel('Minuten', { exact: true }).fill('7')
  await timePicker.getByLabel('Minuten', { exact: true }).press('Enter')
  await expect(timeInput).toHaveValue('23:07')
  await plan.getByLabel('Kurzes Label').fill('Lockerer Lauf')
  await plan.getByLabel('Dauer (m:ss / h:mm:ss)').fill('30')
  await plan.getByLabel('Distanz (km)').fill('5')
  const plannedDate = toLocalDate(
    await plan.getByLabel('Datum', { exact: true }).inputValue(),
  )
  await plan.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.locator('[data-planned-training]:visible')).toHaveCount(1)
  await expect(page.locator('[data-planned-training]:visible')).toContainText(
    '30 min',
  )
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()

  await page
    .getByRole('button', { name: 'Einheit kopieren: Lockerer Lauf' })
    .click()
  await expect(plan.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('30:00')
  await plan.getByLabel('Kurzes Label').fill('Zweiter Lauf')
  await plan.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.locator('[data-planned-training]:visible')).toHaveCount(2)
  await page
    .getByRole('button', { name: 'Training eintragen', exact: true })
    .click()
  const actual = page.getByRole('dialog', { name: 'Training eintragen' })
  await actual.getByRole('combobox', { name: 'Disziplin' }).click()
  await page.getByRole('option', { name: 'Schwimmen', exact: true }).click()
  await expect(
    actual.getByRole('combobox', { name: 'Kontext', exact: true }),
  ).toHaveText('50-m-Becken')
  await actual.getByRole('combobox', { name: 'Disziplin' }).click()
  await page.getByRole('option', { name: 'Laufen', exact: true }).click()
  const runContext = actual.getByRole('combobox', { name: 'Kontext', exact: true })
  await expect(runContext).toHaveText('Straße')
  await runContext.click()
  await expect(page.getByRole('option')).toHaveText(['Straße', 'Laufband'])
  await page.getByRole('option', { name: 'Laufband', exact: true }).click()
  await expect(runContext).toHaveText('Laufband')
  await actual.getByRole('button', { name: 'Speichern' }).click()
  await expect(actual.getByRole('alert')).toContainText(
    'Trage mindestens Dauer oder Distanz ein.',
  )
  await actual.getByLabel('Dauer (m:ss / h:mm:ss)').fill('45')
  await actual.getByLabel('Distanz (km)').fill('10')
  await actual.getByLabel('Ø Herzfrequenz (bpm)').fill('155')
  await expect(actual.getByLabel('Ø Pace (min/km)')).toHaveValue('4:30')
  await actual.getByLabel('Ø Pace (min/km)').fill('5:00')
  await expect(actual.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('50:00')
  await actual.getByLabel('RPE (1–10)').fill('6')
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()
  await actual.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('tab', { name: 'Tagebuch' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator('[data-journal-training]')).toHaveCount(1)
  await expect(page.locator('[data-journal-training]')).toContainText('50 min')
  await expect(page.locator('[data-journal-training]')).toContainText('155')
  await expect(page.locator('[data-journal-training]')).toContainText('Laufband')
  await page.getByRole('button', { name: 'Bearbeiten: Laufen' }).click()
  const edit = page.getByRole('dialog', { name: 'Training bearbeiten' })
  await expect(edit.getByLabel('Ø Herzfrequenz (bpm)')).toHaveValue('155')
  await edit.getByLabel('Dauer (m:ss / h:mm:ss)').fill('45')
  await expect(edit.getByLabel('Ø Pace (min/km)')).toHaveValue('4:30')
  await edit.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.locator('[data-journal-training]')).toContainText('45 min')
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()

  await page.getByRole('tab', { name: 'Planung', exact: true }).click()
  await expect(page.locator('[data-planned-training]:visible')).toHaveCount(2)
  await expect(
    page
      .getByRole('tabpanel', { name: 'Planung', exact: true })
      .getByText('45 min', { exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Woche kopieren' }).click()
  const copy = page.getByRole('dialog', { name: 'Trainingswoche kopieren' })
  const source = copy.getByLabel('Quellwoche', { exact: true })
  const sourceValue = await source.inputValue()
  await source.fill('')
  await expect(copy.getByRole('alert')).toContainText(
    'Bitte wähle eine gültige Quell- und Zielwoche.',
  )
  await source.fill(sourceValue)
  await copy.getByRole('button', { name: '2 Planungen kopieren' }).click()
  await page.getByRole('radio', { name: 'Woche', exact: true }).click()
  await expect(page.locator('[data-planned-training]:visible')).toHaveCount(2)
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    const days = await page
      .locator('[data-calendar-date]:visible')
      .evaluateAll((items) =>
        items.map((item) => ({
          x: item.getBoundingClientRect().x,
          y: item.getBoundingClientRect().y,
        })),
      )
    expect(days).toHaveLength(7)
    expect(new Set(days.map((day) => Math.round(day.y))).size).toBe(1)
    expect(days[6].x).toBeGreaterThan(days[0].x)
  }

  const persisted = await page.context().newPage()
  await persisted.goto('/apps/triathlon-tracker')
  await persisted.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await expect(persisted.locator('[data-journal-training]')).toContainText(
    '45 min',
  )
  await persisted.reload()
  await persisted.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await expect(persisted.locator('[data-journal-training]')).toHaveCount(1)
  await persisted.close()

  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  const viewport = page.viewportSize()
  if (viewport && viewport.width >= 1024) {
    const targetDate = new Date(plannedDate + 'T12:00:00Z')
    targetDate.setUTCDate(
      targetDate.getUTCDate() + (targetDate.getUTCDay() === 0 ? -1 : 1),
    )
    const target = targetDate.toISOString().slice(0, 10)
    await page
      .locator('[data-planned-training]')
      .filter({ hasText: 'Zweiter Lauf' })
      .dragTo(page.locator('[data-calendar-date="' + target + '"]'))
    await expect(
      page.locator('[data-calendar-date="' + target + '"]'),
    ).toContainText('Zweiter Lauf')
  }
  await page.getByRole('tab', { name: 'Verlauf', exact: true }).click()
  await expect(page.locator('[data-week-summary-item]').first()).toContainText(
    '45 min',
  )
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()
  await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await page.getByRole('button', { name: 'Löschen: Laufen' }).click()
  await page
    .getByRole('dialog', { name: 'Training löschen?' })
    .getByRole('button', { name: 'Bestätigen' })
    .click()
  await expect(page.getByText('Noch keine Trainings erfasst')).toBeVisible()
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
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await expect(page.getByText(/W\/kg/)).toBeVisible()
  await expect(page.locator('[data-record-card="run"]')).toContainText(
    'Critical Speed',
  )
  await page.getByRole('combobox', { name: 'Rekordbasis' }).click()
  await page
    .getByRole('option', { name: 'Alle Trainings', exact: true })
    .click()
  await expect(
    page.locator('[data-record-card="run"] [data-record-distance="5000"]'),
  ).toContainText('20:00')
  await expect(page.locator('[data-record-card="swim"]')).toContainText('CSS')
  const recordHeights = await page
    .locator('[data-record-card]')
    .evaluateAll((cards) =>
      cards.map((card) => card.getBoundingClientRect().height),
    )
  expect(Math.max(...recordHeights) - Math.min(...recordHeights)).toBeLessThan(
    1,
  )
  await page.getByRole('tab', { name: 'Verlauf', exact: true }).click()
  await expect(
    page.getByRole('radio', { name: 'Zeit pro Woche' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(
    page.locator('[data-weekly-volume] [role="radiogroup"] [role="radio"]'),
  ).toHaveText(['Zeit pro Woche', 'Distanz pro Woche'])
  await expect(page.locator('[data-performance-plot]')).toHaveCount(3)
  await expect(page.locator('[data-weekly-volume] details')).toHaveCount(0)
  await page.getByRole('radio', { name: '4W' }).click()

  const dataTables = page.locator('[data-chart-tables]')
  await expect(dataTables).toHaveCount(1)
  await dataTables.locator('summary').click()
  await expect(dataTables.locator('[data-performance-table]')).toHaveCount(3)
  const firstPerformanceTable = dataTables.locator(
    '[data-performance-table="run"]',
  )
  await expect(
    firstPerformanceTable.getByRole('cell', { name: 'Ist', exact: true }),
  ).toHaveCount(4)
  await expect(firstPerformanceTable).toContainText('Modell')
  const tableOverflow = await page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - window.innerWidth,
  )
  expect(tableOverflow).toBeLessThanOrEqual(1)
  await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await page
    .locator('button:visible[aria-label="Bearbeiten: Laufen"]')
    .first()
    .click()
  await expect(
    page
      .getByRole('dialog', { name: 'Training bearbeiten' })
      .getByRole('combobox', { name: 'Kontext', exact: true }),
  ).toHaveText('Straße')
  await app.expectHealthy()
})

test(
  'Tagebuch erschließt ältere Trainings durch Filter, Sortierung und Seiten',
  { tag: '@desktop' },
  async ({ app, page }) => {
    await page.addInitScript(() => {
      const trainings = Array.from({ length: 25 }, (_, index) => ({
        id: `entry-${index + 1}`,
        position: index + 1,
        localDate: `2026-08-${String(index + 1).padStart(2, '0')}`,
        startMinutes: null,
        discipline: index % 2 ? 'swim' : 'run',
        context: index % 2 ? 'pool-50' : 'road',
        durationSeconds: 1800,
        distanceMeters: index % 2 ? 1000 : 5000,
        averageHeartRateBpm: null,
        averagePowerWatts: null,
        rpe: null,
        intervals: [],
      }))
      localStorage.setItem(
        'app-hub:collection:apps/triathlon-tracker/sessions/default/actual-trainings',
        JSON.stringify(trainings),
      )
    })
    await app.open('/apps/triathlon-tracker')
    await expect(page.locator('[data-planned-training]')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
    await expect(page.locator('[data-journal-training]')).toHaveCount(20)
    await expect(
      page.locator('[data-journal-training]').first(),
    ).toHaveAttribute('data-journal-training', 'entry-25')
    await page.getByRole('button', { name: 'Weiter', exact: true }).click()
    await expect(page.locator('[data-journal-training]')).toHaveCount(5)
    await expect(
      page.locator('[data-journal-training]').last(),
    ).toHaveAttribute('data-journal-training', 'entry-1')
    await page.getByRole('button', { name: 'Datum', exact: true }).click()
    await expect(
      page.locator('[data-journal-training]').first(),
    ).toHaveAttribute('data-journal-training', 'entry-1')
    await page.getByRole('combobox', { name: 'Disziplin' }).click()
    await page.getByRole('option', { name: 'Schwimmen', exact: true }).click()
    await expect(page.locator('[data-journal-training]')).toHaveCount(12)
    await page.getByLabel('Von', { exact: true }).fill('2026-08-10')
    await page.getByLabel('Bis', { exact: true }).fill('2026-08-14')
    await expect(page.locator('[data-journal-training]')).toHaveCount(3)
    await page.getByLabel('Bis', { exact: true }).fill('2026-08-09')
    await expect(page.getByRole('alert')).toContainText('Das Enddatum muss')
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click()
    await expect(page.locator('[data-journal-training]')).toHaveCount(20)
    await app.expectHealthy()
  },
)

test(
  'Pace und Dauer berechnen Distanz und Leistungstests bleiben gespeichert',
  { tag: '@desktop' },
  async ({ app, page }) => {
    await app.open('/apps/triathlon-tracker')
    await page
      .getByRole('button', { name: 'Training eintragen', exact: true })
      .click()
    const form = page.getByRole('dialog', { name: 'Training eintragen' })
    await form.getByLabel('Ø Pace (min/km)').fill('6:00')
    await form.getByLabel('Dauer (m:ss / h:mm:ss)').fill('36')
    await expect(form.getByLabel('Distanz (km)')).toHaveValue('6')
    await form.getByLabel('Distanz (km)').fill('8')
    await expect(form.getByLabel('Ø Pace (min/km)')).toHaveValue('4:30')
    await form.getByLabel('Ø Pace (min/km)').fill('6:00')
    await expect(form.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('48:00')
    await form.getByLabel('Dauer (m:ss / h:mm:ss)').fill('36')
    await form.getByLabel('Maximaler Leistungstest / Wettkampf').check()
    await form.getByRole('button', { name: 'Speichern' }).click()
    await page.getByRole('tab', { name: 'Rekorde', exact: true }).click()
    await expect(page.locator('[data-record-card="run"]')).toContainText(
      '29:40',
    )
    await expect(page.locator('[data-record-card="run"]')).toContainText(
      'Aus Leistungstests',
    )
    await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
    await page.getByRole('button', { name: 'Bearbeiten: Laufen' }).click()
    const edit = page.getByRole('dialog', { name: 'Training bearbeiten' })
    await expect(
      edit.getByLabel('Maximaler Leistungstest / Wettkampf'),
    ).toBeChecked()
    await expect(edit.getByLabel('Distanz (km)')).toHaveValue('6')
  },
)

test('Rekorde lassen sich sekundengenau anlegen und bleiben nach Kontextwechsel und Reload erhalten', async ({
  app,
  page,
}) => {
  await app.open('/apps/triathlon-tracker')
  await page
    .getByRole('button', { name: 'Laufen · 5 km eintragen', exact: true })
    .click()
  const form = page.getByRole('dialog', { name: 'Training eintragen' })
  await expect(form.getByLabel('Distanz (km)')).toHaveValue('5')
  await expect(
    form.getByLabel('Maximaler Leistungstest / Wettkampf'),
  ).toBeChecked()
  await form.getByLabel('Dauer (m:ss / h:mm:ss)').fill('20:35')
  await form.getByRole('button', { name: 'Speichern', exact: true }).click()
  const runRecord = page.locator(
    '[data-record-card="run"] [data-record-distance="5000"]',
  )
  await expect(
    page.getByRole('tab', { name: 'Rekorde', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(
    runRecord.getByRole('button', { name: 'Rekord bearbeiten: Laufen · 5 km' }),
  ).toHaveText(/20:35/)
  await expect(
    page.locator('[data-record-card="run"] [data-record-distance="42195"]'),
  ).not.toContainText(/\d:\d\d/)
  const swimContext = page.getByRole('combobox', { name: 'Kontext: Schwimmen' })
  await swimContext.click()
  await page.getByRole('option', { name: '25-m-Becken', exact: true }).click()
  await page
    .getByRole('button', { name: 'Schwimmen · 200 m eintragen', exact: true })
    .click()
  await expect(
    form.getByRole('combobox', { name: 'Kontext', exact: true }),
  ).toHaveText('25-m-Becken')
  await expect(form.getByLabel('Distanz (km)')).toHaveValue('0.2')
  await form.getByLabel('Dauer (m:ss / h:mm:ss)').fill('3:10')
  await form.getByRole('button', { name: 'Speichern', exact: true }).click()
  const swim = page.locator('[data-record-card="swim"]')
  await expect(
    swim.getByRole('button', { name: 'Rekord bearbeiten: Schwimmen · 200 m' }),
  ).toHaveText(/3:10/)
  await page
    .getByRole('button', { name: 'Rad · 5 min eintragen', exact: true })
    .click()
  await expect(form.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('5:00')
  await form.getByLabel('Ø Leistung (W)').fill('350')
  await form.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(page.locator('[data-record-card="bike"]')).toContainText('350 W')
  await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await expect(page.locator('[data-journal-training]')).toHaveCount(3)
  await expect(page.locator('[data-journal-training]')).toContainText([
    '5 min',
    '3:10',
    '20:35',
  ])
  await page.getByRole('tab', { name: 'Rekorde', exact: true }).click()
  await expect(swimContext).toHaveText('25-m-Becken')
  await swimContext.click()
  await page.getByRole('option', { name: '50-m-Becken', exact: true }).click()
  await expect(
    swim.getByRole('button', { name: 'Rekord bearbeiten: Schwimmen · 200 m' }),
  ).toHaveCount(0)
  const persisted = await page.context().newPage()
  await persisted.goto('/apps/triathlon-tracker')
  await persisted.reload()
  await expect(
    persisted.locator('[data-record-card="run"] [data-record-distance="5000"]'),
  ).toContainText('20:35')
  await persisted.close()
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()
})
