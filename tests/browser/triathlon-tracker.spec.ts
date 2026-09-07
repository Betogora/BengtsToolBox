import { expect, test } from './browserApp'

test('Plan, Tagebuch und Statistik bleiben getrennt und Trainings sind bearbeitbar', async ({
  app,
  page,
}) => {
  test.setTimeout(90_000)
  await app.open('/apps/triathlon-tracker')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Triathlon-Tracker' }),
  ).toBeVisible()
  await expect(
    page.getByRole('tab', { name: 'Kalender', exact: true }),
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
  await plan.getByLabel('Kurzes Label').fill('Lockerer Lauf')
  await plan.getByLabel('Dauer (min)').fill('30')
  await plan.getByLabel('Distanz (km)').fill('5')
  const plannedDate = await plan
    .getByLabel('Datum', { exact: true })
    .inputValue()
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
  await expect(plan.getByLabel('Dauer (min)')).toHaveValue('30')
  await plan.getByLabel('Kurzes Label').fill('Zweiter Lauf')
  await plan.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.locator('[data-planned-training]:visible')).toHaveCount(2)
  await page
    .getByRole('button', { name: 'Training eintragen', exact: true })
    .click()
  const actual = page.getByRole('dialog', { name: 'Training eintragen' })
  await actual.getByRole('combobox', { name: 'Disziplin' }).click()
  await page.getByRole('option', { name: 'Schwimmen', exact: true }).click()
  await expect(actual.getByRole('combobox', { name: 'Kontext' })).toContainText(
    '50-m-Becken',
  )
  await actual.getByRole('combobox', { name: 'Disziplin' }).click()
  await page.getByRole('option', { name: 'Laufen', exact: true }).click()
  await expect(actual.getByRole('combobox', { name: 'Kontext' })).toContainText(
    'Straße',
  )
  await actual.getByRole('button', { name: 'Speichern' }).click()
  await expect(actual.getByRole('alert')).toContainText(
    'Trage mindestens Dauer oder Distanz ein.',
  )
  await actual.getByLabel('Dauer (min)').fill('45')
  await actual.getByLabel('Distanz (km)').fill('10')
  await actual.getByLabel('Ø Herzfrequenz (bpm)').fill('155')
  await expect(actual.getByLabel('Ø Pace (min/km)')).toHaveValue('4:30')
  await actual.getByLabel('Ø Pace (min/km)').fill('5:00')
  await expect(actual.getByLabel('Dauer (min)')).toHaveValue('50')
  await actual.getByRole('button', { name: 'Weitere Angaben' }).click()
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
  await page.getByRole('button', { name: 'Bearbeiten: Laufen' }).click()
  const edit = page.getByRole('dialog', { name: 'Training bearbeiten' })
  await expect(edit.getByLabel('Ø Herzfrequenz (bpm)')).toHaveValue('155')
  await edit.getByLabel('Dauer (min)').fill('45')
  await expect(edit.getByLabel('Ø Pace (min/km)')).toHaveValue('4:30')
  await edit.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.locator('[data-journal-training]')).toContainText('45 min')
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()

  await page.getByRole('tab', { name: 'Kalender', exact: true }).click()
  await expect(page.locator('[data-planned-training]:visible')).toHaveCount(2)
  await expect(
    page
      .getByRole('tabpanel', { name: 'Kalender', exact: true })
      .getByText('45 min', { exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Woche kopieren' }).click()
  const copy = page.getByRole('dialog', { name: 'Trainingswoche kopieren' })
  const source = copy.getByLabel('Quellwoche')
  const sourceValue = await source.inputValue()
  await source.fill('')
  await expect(copy.getByRole('alert')).toContainText(
    'Bitte wähle eine gültige Quell- und Zielwoche.',
  )
  await source.fill(sourceValue)
  await copy.getByRole('button', { name: '2 Planungen kopieren' }).click()
  await page.getByRole('button', { name: 'Woche', exact: true }).click()
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
  await expect(page.getByText('1 passendes Training')).toBeVisible()
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

  await page.getByRole('tab', { name: 'Statistik', exact: true }).click()
  await expect(page.getByLabel('Aktuelles Gewicht (kg)')).toHaveValue('80')
  await page.getByLabel('Aktuelles Gewicht (kg)').fill('79.5')
  await page.getByLabel('Aktuelles Gewicht (kg)').blur()
  await expect(page.getByText('Gewicht gespeichert.')).toBeVisible()
  await expect(page.getByText(/W\/kg/)).toBeVisible()
  await expect(page.getByText(/Laufen 10 km:/)).toBeVisible()
  await expect(page.getByText(/Schwimmen 1\.500 m:/)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Distanz pro Woche' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.locator('[data-weekly-volume] [role="group"] button'),
  ).toHaveText(['Distanz pro Woche', 'Zeit pro Woche'])
  await expect(
    page.locator('[data-performance-card="swim"]'),
  ).not.toContainText('50-m-Becken')
  await expect(
    page.locator('[data-performance-card="bike"]'),
  ).not.toContainText('Outdoor')
  await expect(page.locator('[data-performance-card="run"]')).not.toContainText(
    'Straße',
  )
  await expect(page.locator('[data-weekly-volume] details')).toHaveCount(0)
  await page.getByRole('button', { name: '4W' }).click()

  const firstPerformanceTable = page
    .locator('[data-performance-plot] details:visible')
    .filter({ hasText: 'Daten als Tabelle anzeigen' })
    .first()
  await firstPerformanceTable.locator('summary').click()
  await expect(
    firstPerformanceTable.getByRole('cell', { name: 'Ist', exact: true }),
  ).toHaveCount(4)
  await expect(firstPerformanceTable).toContainText('Modell')
  await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await page
    .locator('button:visible[aria-label="Bearbeiten: Laufen"]')
    .first()
    .click()
  await expect(
    page
      .getByRole('dialog', { name: 'Training bearbeiten' })
      .getByRole('combobox', { name: 'Kontext' }),
  ).toContainText('Straße')
  await page.mouse.move(1, 1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 6000,
  })
  await app.expectHealthy()
})

test('Tagebuch erschließt ältere Trainings durch Filter, Sortierung und Seiten', async ({
  app,
  page,
}) => {
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
  await expect(page.locator('[data-journal-training]').first()).toHaveAttribute(
    'data-journal-training',
    'entry-25',
  )
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.locator('[data-journal-training]')).toHaveCount(5)
  await expect(page.locator('[data-journal-training]').last()).toHaveAttribute(
    'data-journal-training',
    'entry-1',
  )
  await page.getByRole('button', { name: 'Datum', exact: true }).click()
  await expect(page.locator('[data-journal-training]').first()).toHaveAttribute(
    'data-journal-training',
    'entry-1',
  )
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
})

test('Pace und Dauer berechnen Distanz und Leistungstests bleiben gespeichert', async ({
  app,
  page,
}) => {
  await app.open('/apps/triathlon-tracker')
  await page
    .getByRole('button', { name: 'Training eintragen', exact: true })
    .click()
  const form = page.getByRole('dialog', { name: 'Training eintragen' })
  await form.getByLabel('Ø Pace (min/km)').fill('6:00')
  await form.getByLabel('Dauer (min)').fill('36')
  await expect(form.getByLabel('Distanz (km)')).toHaveValue('6')
  await form.getByLabel('Distanz (km)').fill('8')
  await expect(form.getByLabel('Ø Pace (min/km)')).toHaveValue('4:30')
  await form.getByLabel('Ø Pace (min/km)').fill('6:00')
  await expect(form.getByLabel('Dauer (min)')).toHaveValue('48')
  await form.getByLabel('Dauer (min)').fill('36')
  await form.getByLabel('Maximaler Leistungstest / Wettkampf').check()
  await form.getByRole('button', { name: 'Speichern' }).click()
  await page.getByRole('tab', { name: 'Statistik', exact: true }).click()
  await expect(page.locator('[data-performance-card="run"]')).toContainText(
    '29:40',
  )
  await expect(page.locator('[data-performance-card="run"]')).toContainText(
    'Aus Leistungstests',
  )
  await page.getByRole('tab', { name: 'Tagebuch', exact: true }).click()
  await page.getByRole('button', { name: 'Bearbeiten: Laufen' }).click()
  const edit = page.getByRole('dialog', { name: 'Training bearbeiten' })
  await expect(
    edit.getByLabel('Maximaler Leistungstest / Wettkampf'),
  ).toBeChecked()
  await expect(edit.getByLabel('Distanz (km)')).toHaveValue('6')
})

test('visuelle Vorschau mit Beispieldaten', async ({ app, page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Screenshots werden einmal in drei Größen aufgenommen.',
  )
  await page.addInitScript(() => {
    const date = (offset: number) => {
      const value = new Date()
      value.setDate(value.getDate() + offset)
      const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'Europe/Berlin',
        })
          .formatToParts(value)
          .map((part) => [part.type, part.value]),
      )
      return `${p.year}-${p.month}-${p.day}`
    }
    const today = date(0)
    const mondayOffset = -(new Date(today + 'T12:00:00').getDay() + 6) % 7
    const activity = (
      id: string,
      offset: number,
      discipline: string,
      durationSeconds: number,
      distanceMeters: number,
      isBenchmark = false,
      averagePowerWatts: number | null = null,
    ) => ({
      id,
      position: offset + 100,
      localDate: date(offset),
      startMinutes: null,
      discipline,
      context:
        discipline === 'run'
          ? 'road'
          : discipline === 'swim'
            ? 'pool-50'
            : 'outdoor',
      durationSeconds,
      distanceMeters,
      averageHeartRateBpm: null,
      averagePowerWatts,
      rpe: null,
      intervals: [],
      isBenchmark,
    })
    const actual = Array.from({ length: 8 }, (_, week) => [
      activity(`run-${week}`, -week * 7 - 2, 'run', 3000 + week * 30, 8000),
      activity(`bike-${week}`, -week * 7 - 3, 'bike', 5400 + week * 120, 38000),
      activity(`swim-${week}`, -week * 7 - 4, 'swim', 2100 + week * 25, 1400),
    ]).flat()
    actual.push(activity('race-before', -35, 'run', 1980, 5000, true))
    actual.push(activity('race-example', -1, 'run', 2160, 6000, true))
    actual.push(
      activity('css-200', -5, 'swim', 230, 200, true),
      activity('css-400', -4, 'swim', 490, 400, true),
    )
    for (const [index, seconds] of [180, 600, 1200].entries())
      actual.push(
        activity(
          `cp-${index}`,
          -index - 1,
          'bike',
          seconds,
          seconds * 9,
          true,
          230 + 18000 / seconds,
        ),
      )
    localStorage.setItem(
      'app-hub:collection:apps/triathlon-tracker/sessions/default/actual-trainings',
      JSON.stringify(actual),
    )
    localStorage.setItem(
      'app-hub:doc:apps/triathlon-tracker/sessions/default/state/default',
      JSON.stringify({ schemaVersion: 1, weightKg: 75 }),
    )
    const labels = [
      'Technik & Wassergefühl',
      'Grundlagenausfahrt',
      'Lockerer Dauerlauf',
      'Schwimmintervalle',
      'Tempo & Trittfrequenz',
      'Langer Lauf',
      'Regenerative Ausfahrt',
    ]
    const sports = ['swim', 'bike', 'run', 'swim', 'bike', 'run', 'bike']
    localStorage.setItem(
      'app-hub:collection:apps/triathlon-tracker/sessions/default/planned-trainings',
      JSON.stringify(
        labels.map((label, index) => ({
          id: `plan-${index}`,
          position: index,
          localDate: date(mondayOffset + index),
          startMinutes: 1080,
          discipline: sports[index],
          durationSeconds: [2700, 5400, 2160, 3000, 4500, 4200, 3600][index],
          distanceMeters: [1800, 45000, 6000, 2000, 35000, 11000, 25000][index],
          label,
        })),
      ),
    )
  })
  await app.open('/apps/triathlon-tracker')
  await page.getByRole('tab', { name: 'Statistik', exact: true }).click()
  await expect(page.locator('[data-performance-card="run"]')).toContainText(
    '29:40',
  )
  await expect(
    page.locator('[data-performance-plot="run"] svg').first(),
  ).toBeVisible()
  await app.expectHealthy()
  await page.screenshot({
    path: 'logs/triathlon-statistics-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('tab', { name: 'Kalender', exact: true }).click()
  await page.getByRole('button', { name: 'Woche', exact: true }).click()
  await page.setViewportSize({ width: 768, height: 1024 })
  await app.expectHealthy()
  await page.screenshot({
    path: 'logs/triathlon-week-tablet.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.setViewportSize({ width: 1100, height: 1000 })
  await page
    .getByRole('button', { name: 'Training eintragen', exact: true })
    .click()
  const form = page.getByRole('dialog', { name: 'Training eintragen' })
  await form.getByLabel('Ø Pace (min/km)').fill('6:00')
  await form.getByLabel('Dauer (min)').fill('36')
  await expect(form.getByLabel('Distanz (km)')).toHaveValue('6')
  await app.expectHealthy()
  await form.screenshot({
    path: 'logs/triathlon-pace-form.png',
    animations: 'disabled',
  })
})
