const review = {
  defaultView: 'mobile',
  views: {
    'mobile-320': { width: 320, height: 844 },
    'mobile-360': { width: 360, height: 844 },
    'mobile-375': { width: 375, height: 844 },
    mobile: { width: 390, height: 844 },
    'mobile-393': { width: 393, height: 844 },
    'mobile-412': { width: 412, height: 844 },
    'mobile-430': { width: 430, height: 844 },
    'mobile-440': { width: 440, height: 844 },
    'triathlon-639': { width: 639, height: 1050 },
    'triathlon-641': { width: 641, height: 1050 },
    'calendar-767': { width: 767, height: 1050 },
    'tablet-768': { width: 768, height: 1050 },
    'calendar-769': { width: 769, height: 1050 },
    'tablet-820': { width: 820, height: 1050 },
    'triathlon-899': { width: 899, height: 1050 },
    'triathlon-901': { width: 901, height: 1050 },
    'calendar-1023': { width: 1023, height: 1050 },
    'tablet-1024': { width: 1024, height: 1050 },
    'calendar-1025': { width: 1025, height: 1050 },
    'desktop-1280': { width: 1280, height: 1050 },
    desktop: { width: 1440, height: 1050 },
    'desktop-1920': { width: 1920, height: 1050 },
  },
  settle: 700,
  setup: async (page, base) => {
    // Aufnahmen verändern nie echte Daten, auch nicht über einen Server mit .env.local.
    await page.context().route(
      (url) => /(^|\.)(googleapis\.com|firebaseio\.com|firebasedatabase\.app|firebaseapp\.com)$/.test(url.hostname),
      (route) => route.abort('blockedbyclient'),
    )
    await page.goto(base + '/apps/triathlon-tracker')
    await page.addInitScript(() => {
      const dates = (daysAgo) => {
        const date = new Date()
        date.setDate(date.getDate() - daysAgo)
        return new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Berlin',
        }).format(date)
      }
      const entries = [
        ['run', 'road', 1235, 5000, null, 1],
        ['run', 'road', 2590, 10000, null, 8],
        ['run', 'road', 230, 1000, null, 16],
        ['run', 'road', 2760, 9000, null, 4, false],
        ['swim', 'pool-50', 190, 200, null, 2],
        ['swim', 'pool-50', 400, 400, null, 9],
        ['swim', 'pool-50', 820, 750, null, 20],
        ['bike', 'outdoor', 180, null, 250 + 18000 / 180, 3],
        ['bike', 'outdoor', 300, null, 250 + 18000 / 300, 10],
        ['bike', 'outdoor', 720, null, 250 + 18000 / 720, 17],
        ['bike', 'outdoor', 1200, null, 250 + 18000 / 1200, 24],
        ['bike', 'outdoor', 1800, 20000, null, 5],
        ['bike', 'outdoor', 3750, 40000, null, 12],
        ['run', 'road', 3000, 10000, null, 30, false],
        ['swim', 'pool-50', 1900, 1500, null, 31, false],
      ].map(
        (
          [
            discipline,
            context,
            durationSeconds,
            distanceMeters,
            averagePowerWatts,
            days,
            isBenchmark = true,
          ],
          index,
        ) => ({
          id: `preview-${index}`,
          position: index,
          localDate: dates(days),
          analyticsAvailableFromLocalDate: dates(days),
          startMinutes: null,
          discipline,
          context,
          durationSeconds,
          distanceMeters,
          averagePowerWatts,
          averageHeartRateBpm: discipline === 'run' ? 162 : null,
          rpe: isBenchmark ? 9 : 4,
          isBenchmark,
          intervals: [],
        }),
      )
      const today = dates(0)
      const day = new Date(`${today}T12:00:00Z`).getUTCDay()
      const weekDay = (offset) => dates(((day + 6) % 7) - offset)
      const plans = [
        ['swim', 1, 1800, 1500, 'Technik · 6 × 100 m'],
        ['run', 2, 2400, 7000, 'Locker · Gesprächstempo'],
        ['bike', 3, 3600, 30000, 'Grundlage · gleichmäßig'],
        ['swim', 4, 2100, 1800, '400-m-Test + Technik'],
        ['run', 5, 3000, 10000, 'Langer Lauf'],
        ['bike', 6, 5400, 45000, 'Ausfahrt'],
      ].map(
        (
          [discipline, offset, durationSeconds, distanceMeters, label],
          index,
        ) => ({
          id: `plan-preview-${index}`,
          position: index,
          discipline,
          localDate: weekDay(offset),
          startMinutes: 18 * 60,
          durationSeconds,
          distanceMeters,
          label,
        }),
      )
      localStorage.setItem('bengtstoolbox.language', 'de')
      localStorage.setItem(
        'app-hub:collection:apps/triathlon-tracker/sessions/default/actual-trainings',
        JSON.stringify(
          new URLSearchParams(location.search).has('review-empty') ? [] : entries,
        ),
      )
      localStorage.setItem(
        'app-hub:collection:apps/triathlon-tracker/sessions/default/planned-trainings',
        JSON.stringify(plans),
      )
      localStorage.setItem(
        'app-hub:doc:apps/triathlon-tracker/sessions/default/state/default',
        JSON.stringify({ schemaVersion: 1, weightKg: 78 }),
      )
    })
  },
  beforeEach: async (page) => {
    await page.evaluate(async () => document.fonts.ready)
    await page.emulateMedia({ reducedMotion: 'reduce' })
  },
  scenes: {
    uebersicht: { path: '/apps/triathlon-tracker' },
    rekorde: {
      path: '/apps/triathlon-tracker',
      run: async ({ page }) => {
        await page
          .locator('[data-record-card=swim]')
          .evaluate((el) => el.scrollIntoView({ block: 'start' }))
        await page.evaluate(() => scrollBy(0, -88))
      },
    },
    'rekorde-rad': {
      path: '/apps/triathlon-tracker',
      run: async ({ page }) => {
        await page
          .locator('[data-record-card=bike]')
          .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      },
    },
    'rekorde-laufen': {
      path: '/apps/triathlon-tracker',
      run: async ({ page }) => {
        await page
          .locator('[data-record-card=run]')
          .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      },
    },
    planung: { path: '/apps/triathlon-tracker', click: ['Planung'] },
    agenda: {
      path: '/apps/triathlon-tracker',
      click: ['Planung'],
      run: async ({ page }) => {
        await page
          .locator('[data-calendar-date]')
          .first()
          .evaluate((el) => el.scrollIntoView({ block: 'start' }))
        await page.evaluate(() => scrollBy(0, -88))
      },
    },
    tagebuch: { path: '/apps/triathlon-tracker', click: ['Tagebuch'] },
    wochenvolumen: {
      path: '/apps/triathlon-tracker',
      click: ['Verlauf'],
      run: async ({ page }) => {
        await page.locator('[data-weekly-volume]').scrollIntoViewIfNeeded()
      },
    },
    leistung: {
      path: '/apps/triathlon-tracker',
      click: ['Verlauf'],
      run: async ({ page }) => {
        await page
          .locator('[data-performance-plot=run]')
          .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      },
    },
    'leistung-rad': {
      path: '/apps/triathlon-tracker',
      click: ['Verlauf'],
      run: async ({ page }) => {
        await page
          .locator('[data-performance-plot=bike]')
          .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      },
    },
    'training-eintragen': {
      path: '/apps/triathlon-tracker',
      click: ['Training eintragen'],
    },
  },
}

Object.assign(review.scenes, {
  'picker-date': {
    path: '/apps/triathlon-tracker',
    run: async ({ page }) => {
      await page.getByRole('button', { name: 'Planen', exact: true }).click()
      const calendar = page.getByRole('button', {
        name: 'Kalender öffnen: Datum',
        exact: true,
      })
      if (await calendar.count()) await calendar.click()
    },
  },
  'picker-time': {
    path: '/apps/triathlon-tracker',
    run: async ({ page }) => {
      await page.getByRole('button', { name: 'Planen', exact: true }).click()
      const clock = page.getByRole('button', {
        name: 'Uhrzeit wählen: Uhrzeit (optional)',
        exact: true,
      })
      if (await clock.count()) await clock.click()
    },
  },
  'picker-dropdown': {
    path: '/apps/triathlon-tracker',
    run: async ({ page }) => {
      await page.getByRole('button', { name: 'Planen', exact: true }).click()
      await page
        .getByRole('combobox', { name: 'Disziplin', exact: true })
        .click()
    },
  },
  'model-sources': {
    path: '/apps/triathlon-tracker',
    run: async ({ page }) => {
      const sources = page
        .locator('details')
        .filter({
          has: page.getByText(
            /Wie entstehen die Hochrechnungen|Modelle & Quellen/,
          ),
        })
      await sources.locator('summary').click()
      await sources.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
  'record-empty': {
    path: '/apps/triathlon-tracker?review-empty=1',
    run: async ({ page }) => {
      await page.locator('[data-record-card]').last().waitFor()
      await page
        .locator('[data-record-card=run]')
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
})

for (const scene of Object.values(review.scenes)) {
  const run = scene.run
  scene.run = async (context) => {
    await run?.(context)
    await context.page.mouse.move(0, 0)
    await context.page.waitForTimeout(250)
  }
}

export default review
