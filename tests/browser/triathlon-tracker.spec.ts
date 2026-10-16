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
    page.getByRole('tablist', { name: 'Triathlon-Tracker' }).getByRole('tab'),
  ).toHaveText(['Planung', 'Rekorde', 'Statistik', 'Tagebuch'])
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
  await timePicker
    .getByRole('listbox', { name: 'Stunden' })
    .getByRole('option', { name: '23', exact: true })
    .click()
  const minuteColumn = timePicker.getByRole('listbox', { name: 'Minuten' })
  await minuteColumn.getByRole('option', { name: '07', exact: true }).click()
  await minuteColumn.press('Enter')
  await expect(timeInput).toHaveValue('23:07')
  await plan.getByLabel('Kurzes Label').fill('Lockerer Lauf')
  await plan.getByLabel('Dauer (m:ss / h:mm:ss)').fill('30')
  await expect(plan.getByLabel('Distanz (km)')).toHaveValue('4.29')
  await plan.getByRole('radio', { name: 'Gehen' }).click()
  await expect(plan.getByLabel('Distanz (km)')).toHaveValue('3')
  await plan.getByRole('radio', { name: 'Laufen' }).click()
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
  await expect(actual.getByLabel('Ø Tempo (km/h)')).toHaveCount(0)
  await actual.getByRole('combobox', { name: 'Disziplin' }).click()
  await page.getByRole('option', { name: 'Rad', exact: true }).click()
  await expect(
    actual.getByRole('combobox', { name: 'Kontext', exact: true }),
  ).toHaveText('Ergometer')
  await actual.getByRole('combobox', { name: 'Disziplin' }).click()
  await page.getByRole('option', { name: 'Laufen', exact: true }).click()
  const runContext = actual.getByRole('combobox', { name: 'Kontext', exact: true })
  await expect(runContext).toHaveText('Straße')
  await actual.getByRole('radio', { name: 'Gehen' }).click()
  await expect(runContext).toHaveText('Laufband')
  await actual.getByRole('radio', { name: 'Laufen' }).click()
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
  await expect(actual.getByLabel('Ø Tempo (km/h)')).toHaveValue('12')
  await actual.getByRole('combobox', { name: 'RPE (1–10)' }).click()
  await page.getByRole('option', { name: '6 · deutlich anstrengend' }).click()
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
  await page.getByRole('tab', { name: 'Statistik', exact: true }).click()
  await expect(page.locator('[data-week-summary-item]').first()).toContainText(
    '45 min',
  )
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()
  await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await page.getByRole('button', { name: 'Bearbeiten: Laufen' }).click()
  const editBeforeDelete = page.getByRole('dialog', { name: 'Training bearbeiten' })
  const inlineDelete = editBeforeDelete.getByRole('button', { name: 'Löschen', exact: true })
  await inlineDelete.click()
  await expect(
    editBeforeDelete
      .getByRole('group', { name: 'Training löschen?' })
      .getByRole('button', { name: 'Bestätigen' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(inlineDelete).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(editBeforeDelete).toBeHidden()
  await page.getByRole('button', { name: 'Löschen: Laufen' }).click()
  const deletePopover = page.getByRole('dialog', { name: 'Training löschen?' })
  await expect(deletePopover).toHaveAccessibleDescription(/./)
  await expect(deletePopover.getByRole('button', { name: 'Bestätigen' })).toBeFocused()
  await page.keyboard.press('Enter')
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
        // Ohne Kontext gespeicherte Altfahrten zählen zum Ergometer.
        null,
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
  await page.getByLabel('Plantempo Gehen (km/h)').fill('5')
  await expect(page.getByLabel('Plantempo Gehen (min/km)')).toHaveValue('12:00')
  await page.getByLabel('Plantempo Gehen (km/h)').blur()
  await expect(page.getByText('Plantempo gespeichert.')).toBeVisible()
  // A fading toast would fail the contrast check in expectHealthy later on.
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await page.getByRole('tab', { name: 'Rekorde', exact: true }).click()
  await expect(page.getByText(/W\/kg/)).toBeVisible()
  await expect(page.locator('[data-record-card]')).toHaveCount(3)
  for (const card of await page.locator('[data-record-card]').all()) {
    await expect(card).not.toContainText(/Anker|Critical Speed|CSS|Leistungstests/)
  }
  await expect(page.getByRole('combobox', { name: 'Rekordbasis' })).toHaveText(
    'Alle Trainings',
  )
  await expect(
    page.locator('[data-record-card="run"] [data-record-distance="5000"]'),
  ).toContainText('20:00')
  await page.getByRole('combobox', { name: 'Rekordbasis' }).click()
  await page
    .getByRole('option', { name: 'Nur Leistungstests', exact: true })
    .click()
  const estimatedFiveK = page.locator(
    '[data-record-card="run"] [data-record-distance="5000"] [data-record-estimate]',
  )
  await expect(estimatedFiveK).toHaveText(/^\d+:\d{2}\*/)
  const recordHeights = await page
    .locator('[data-record-card]')
    .evaluateAll((cards) =>
      cards.map((card) => card.getBoundingClientRect().height),
    )
  expect(Math.max(...recordHeights) - Math.min(...recordHeights)).toBeLessThan(
    1,
  )
  await page.getByRole('tab', { name: 'Statistik', exact: true }).click()
  await expect(
    page.getByRole('radio', { name: 'Zeit pro Woche' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(
    page.locator('[data-weekly-volume] [role="radiogroup"] [role="radio"]'),
  ).toHaveText(['Zeit pro Woche', 'Distanz pro Woche'])
  await expect(page.locator('[data-performance-plot]')).toHaveCount(3)
  await expect(page.locator('[data-weekly-volume] details')).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Alles' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  const runFilter = page.locator('[data-volume-filter="run"]')
  await runFilter.click()
  await expect(runFilter).toHaveAttribute('aria-pressed', 'true')
  await runFilter.click()
  await expect(runFilter).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('radio', { name: '4W' }).click()

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
    await page.getByRole('button', { name: 'Zeitraum', exact: true }).click()
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
  await page.getByRole('tab', { name: 'Rekorde', exact: true }).click()
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
  await persisted.getByRole('tab', { name: 'Rekorde', exact: true }).click()
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

test(
  'Geplante Gehen-Einheit lässt sich vorausgefüllt als erledigt eintragen',
  { tag: '@desktop' },
  async ({ app, page }) => {
    await page.addInitScript(() => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Europe/Berlin',
        year: 'numeric',
      }).formatToParts(new Date())
      const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
      )
      localStorage.setItem(
        'app-hub:collection:apps/triathlon-tracker/sessions/default/planned-trainings',
        JSON.stringify([
          {
            id: 'walk-plan',
            position: 1,
            localDate: `${values.year}-${values.month}-${values.day}`,
            startMinutes: null,
            discipline: 'run',
            isWalk: true,
            inclinePercent: 5,
            durationSeconds: 4_200,
            distanceMeters: null,
            label: 'Incline Walk',
          },
          {
            id: 'strength-plan',
            position: 2,
            localDate: `${values.year}-${values.month}-${values.day}`,
            startMinutes: null,
            discipline: 'strength',
            durationSeconds: 1_800,
            distanceMeters: null,
            label: 'Kraft A',
          },
        ]),
      )
    })
    await app.open('/apps/triathlon-tracker')
    await page.getByRole('tab', { name: 'Planung', exact: true }).click()
    const planned = page.locator('[data-planned-training="walk-plan"]')
    await expect(planned).not.toHaveAttribute('data-plan-done')
    await planned
      .getByRole('button', { name: 'Als erledigt eintragen: Incline Walk' })
      .click()
    const form = page.getByRole('dialog', { name: 'Training eintragen' })
    await expect(form.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('1:10:00')
    await expect(form.getByRole('radio', { name: 'Gehen' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(
      form.getByRole('combobox', { name: 'Kontext', exact: true }),
    ).toHaveText('Laufband')
    await expect(form.getByLabel('Steigung (%)')).toHaveValue('5')
    await form.getByLabel('Distanz (km)').fill('6')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(planned).toHaveAttribute('data-plan-done', 'true')
    await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
    const journal = page.locator('[data-journal-training]')
    await expect(journal).toContainText('Gehen')
    await expect(journal).toContainText('5 % · 300 Hm · 5,7 MET')
    await page.getByRole('tab', { name: 'Rekorde', exact: true }).click()
    await expect(
      page.locator('[data-walking-record="climb"]'),
    ).toContainText('300 Hm')
    await expect(
      page.locator('[data-walking-record="climbRate"]'),
    ).toContainText('257 Hm/h')

    // Strength: grey plan entry, duration only, counted in total time only.
    await page.getByRole('tab', { name: 'Planung', exact: true }).click()
    const strength = page.locator('[data-planned-training="strength-plan"]')
    await expect(strength).toHaveAttribute('data-discipline', 'strength')
    await strength
      .getByRole('button', { name: 'Als erledigt eintragen: Kraft A' })
      .click()
    await expect(form.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('30:00')
    await expect(form.getByRole('combobox', { name: 'Kontext', exact: true })).toHaveCount(0)
    await expect(form.getByLabel('Distanz (km)')).toHaveCount(0)
    await expect(form.getByRole('combobox', { name: 'RPE (1–10)' })).toHaveCount(0)
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(strength).toHaveAttribute('data-plan-done', 'true')
    await expect(page.locator('[data-week-summary-item]')).toHaveCount(4)
    await expect(page.locator('[data-week-summary-item]').first()).toContainText('1 h 40 min')
    await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
    await expect(journal.filter({ hasText: 'Krafttraining' })).toHaveCount(1)
    await app.expectHealthy()
  },
)

test('Geplante Intervalle öffnen eine Phasentabelle, die unterwegs ausfüllbar ist', async ({
  app,
  page,
}) => {
  await page.addInitScript(() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Europe/Berlin',
      year: 'numeric',
    }).formatToParts(new Date())
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    localStorage.setItem(
      'app-hub:collection:apps/triathlon-tracker/sessions/default/planned-trainings',
      JSON.stringify([
        {
          id: 'interval-plan',
          position: 1,
          localDate: `${values.year}-${values.month}-${values.day}`,
          startMinutes: null,
          discipline: 'run',
          durationSeconds: 2_100,
          distanceMeters: null,
          label: 'Intervalle 3×4 min',
        },
      ]),
    )
  })
  await app.open('/apps/triathlon-tracker')
  await page.getByRole('tab', { name: 'Planung', exact: true }).click()
  await page
    .getByRole('button', { name: 'Als erledigt eintragen: Intervalle 3×4 min' })
    .click()
  const form = page.getByRole('dialog', { name: 'Training eintragen' })
  const phases = form.locator('[data-phase-kind]')
  await expect(phases).toHaveCount(7)
  await expect(phases.first()).toContainText('Einlaufen')
  await expect(phases.last()).toContainText('Auslaufen')
  await expect(form.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('35:00')

  await form.getByLabel('Einlaufen · Ø Tempo (km/h)').fill('9')
  await form.getByLabel('Intervall 1 · Ø Tempo (km/h)').fill('13')
  const firstEndPulse = form.getByLabel('Intervall 1 · Puls am Phasenende')
  await firstEndPulse.fill('185')
  // Enter jumps to the next phase instead of saving the dialog.
  await firstEndPulse.press('Enter')
  await expect(form.getByLabel('Erholung · Puls am Phasenende').first()).toBeFocused()
  await expect(form.getByLabel('Intervall 2 · Ø Tempo (km/h)')).toHaveAttribute(
    'placeholder',
    '13',
  )
  await expect(form.getByLabel('Distanz (km)')).toHaveValue('6.05')
  await expect(form.getByLabel('Distanz (km)')).toHaveAttribute('readonly', '')

  await form.getByRole('button', { name: 'Intervall', exact: true }).click()
  await expect(phases).toHaveCount(9)
  await expect(form.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('43:00')
  await form.getByRole('button', { name: 'Intervall 4 entfernen' }).click()
  await expect(phases).toHaveCount(7)

  await form.getByRole('button', { name: 'Speichern' }).click()
  await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await expect(page.locator('[data-journal-training]')).toContainText('3 Intervalle')
  await page.getByRole('button', { name: 'Bearbeiten: Laufen' }).click()
  const edit = page.getByRole('dialog', { name: 'Training bearbeiten' })
  await expect(edit.getByLabel('Intervall 1 · Puls am Phasenende')).toHaveValue('185')
  await expect(edit.getByLabel('Intervall 3 · Ø Tempo (km/h)')).toHaveValue('13')

  // Rebuilding starts again from a scheme.
  await edit.getByRole('button', { name: 'Neu aufbauen' }).click()
  await edit.getByRole('button', { name: 'Bestätigen' }).click()
  await edit.getByLabel('Anzahl').fill('4')
  await edit.getByRole('button', { name: 'Tabelle erzeugen' }).click()
  await expect(edit.locator('[data-phase-kind="work"]')).toHaveCount(4)
  await expect(edit.getByLabel('Dauer (m:ss / h:mm:ss)')).toHaveValue('43:00')
  // The sticky footer covers rows mid-scroll; at the end nothing is hidden.
  await edit.evaluate((dialog) => dialog.scrollTo(0, dialog.scrollHeight))
  await app.expectHealthy()
})
