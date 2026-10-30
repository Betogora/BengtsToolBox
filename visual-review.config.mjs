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
      click: ['Statistik'],
      run: async ({ page }) => {
        await page.locator('[data-weekly-volume]').scrollIntoViewIfNeeded()
      },
    },
    leistung: {
      path: '/apps/triathlon-tracker',
      click: ['Statistik'],
      run: async ({ page }) => {
        await page
          .locator('[data-performance-plot=run]')
          .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      },
    },
    'leistung-rad': {
      path: '/apps/triathlon-tracker',
      click: ['Statistik'],
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
  'planung-monat': {
    path: '/apps/triathlon-tracker',
    click: ['Planung'],
    run: async ({ page }) => {
      await page.getByRole('radio', { name: 'Monat', exact: true }).click()
      await page.waitForTimeout(400)
    },
  },
  'woche-kopieren': {
    path: '/apps/triathlon-tracker',
    click: ['Planung'],
    run: async ({ page }) => {
      await page
        .getByRole('button', { name: 'Woche kopieren', exact: true })
        .first()
        .click()
      await page.getByRole('dialog').waitFor()
    },
  },
  'plan-eintragen': {
    path: '/apps/triathlon-tracker',
    run: async ({ page }) => {
      await page.getByRole('button', { name: 'Planen', exact: true }).click()
      await page.getByRole('dialog').waitFor()
    },
  },
  'tagebuch-liste': {
    path: '/apps/triathlon-tracker',
    click: ['Tagebuch'],
    run: async ({ page }) => {
      await page
        .locator('[data-journal-training]')
        .nth(2)
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
  'tagebuch-leer': {
    path: '/apps/triathlon-tracker?review-empty=1',
    click: ['Tagebuch'],
  },
  verlauf: { path: '/apps/triathlon-tracker', click: ['Statistik'] },
  'leistung-schwimmen': {
    path: '/apps/triathlon-tracker',
    click: ['Statistik'],
    run: async ({ page }) => {
      await page
        .locator('[data-performance-plot=swim]')
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
  fortschritt: {
    path: '/apps/triathlon-tracker',
    click: ['Statistik'],
    run: async ({ page }) => {
      const details = page
        .locator('details')
        .filter({ has: page.locator('summary', { hasText: 'Fortschrittsindex' }) })
      if (await details.count()) {
        await details.first().locator('summary').click()
        await page.waitForTimeout(400)
      }
      await page
        .getByText('Fortschrittsindex', { exact: true })
        .first()
        .evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await page.evaluate(() => scrollBy(0, -88))
    },
  },
  datentabellen: {
    path: '/apps/triathlon-tracker',
    click: ['Statistik'],
    run: async ({ page }) => {
      const tables = page.locator('[data-chart-tables]')
      const summary = tables.locator('summary')
      if (await summary.count()) await summary.first().click()
      await page.waitForTimeout(400)
      await tables.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await page.evaluate(() => scrollBy(0, -88))
    },
  },
  'verlauf-leer': {
    path: '/apps/triathlon-tracker?review-empty=1',
    click: ['Statistik'],
  },
  intervalle: {
    path: '/apps/triathlon-tracker',
    click: ['Training eintragen'],
    run: async ({ page }) => {
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: 'Intervalle' }).click()
      await dialog
        .getByRole('button', { name: 'Abschnitt hinzufügen' })
        .click()
      await page.waitForTimeout(300)
      await dialog
        .getByText('Abschnitt 1', { exact: true })
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
})

// Sushi-Map: vier Touristen mit Besuchen auf beiden Karten, Deutschlandkarte aktiv.
const sushiPath = '/apps/sushi'
const seedSushi = () => {
  const base = 'apps/territory-map/sessions/default'
  const players = [
    ['person-2', 'Paul', '#ffd584'],
    ['person-1', 'Bengt', '#7b0fff'],
    ['person-3', 'Lennart', '#f0047f'],
    ['person-4', 'Sushi-Tourist 4', '#14b8a6'],
  ].map(([id, name, color], index) => ({ id, name, color, position: index + 1 }))
  const visits = {
    'person-2': [['it', 'es', 'pt', 'nl', 'at', 'ch', 'dk', 'se', 'jp', 'us'], ['DE-BW', 'DE-HE', 'DE-NW', 'DE-NI', 'DE-SH']],
    'person-1': [['gb-eng', 'pl', 'cz', 'gr', 'hr', 'ie'], ['DE-BY', 'DE-SN', 'DE-BB', 'DE-TH', 'DE-MV', 'DE-ST']],
    'person-3': [['ca', 'th', 'vn'], ['DE-HH']],
    'person-4': [['eg', 'al'], ['DE-RP']],
  }
  const events = players.flatMap((player) =>
    visits[player.id].flatMap((ids, mapIndex) =>
      ids.map((territoryId) => ({ mapId: mapIndex ? 'germany' : 'world', territoryId, player })),
    ),
  ).map(({ mapId, territoryId, player }, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index * 3, 12))
    return {
      id: `sushi-preview-${index}`,
      mapId,
      territoryId,
      territoryName: territoryId,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      createdAtClientIso: date.toISOString(),
      createdAtLabel: date.toLocaleDateString('de-DE'),
      position: index,
    }
  })
  localStorage.setItem(`app-hub:collection:${base}/players`, JSON.stringify(players))
  localStorage.setItem(
    `app-hub:collection:${base}/datasets`,
    JSON.stringify([{ id: 'dataset-current', position: 1, name: 'Datensatz', status: 'active', createdAtClientIso: '2026-01-01T00:00:00.000Z', archivedAtClientIso: null, events }]),
  )
  localStorage.setItem(
    `app-hub:doc:${base}/state/default`,
    JSON.stringify({ activeMap: 'germany', isAchievementsOpen: false, isScoreOpen: true }),
  )
}
const showSushiScore = async (page) => {
  await page.getByRole('button', { name: 'Punktzahl' }).first().waitFor()
  await page.waitForTimeout(400)
  await page
    .getByRole('button', { name: 'Erfolge' })
    .evaluate((el) => el.scrollIntoView({ block: 'end' }))
  await page.evaluate(() => scrollBy(0, 120))
}
const setup = review.setup
review.setup = async (page, base) => {
  await setup(page, base)
  await page.addInitScript(seedSushi)
}

Object.assign(review.scenes, {
  'sushi-punktzahl': { path: sushiPath, run: async ({ page }) => showSushiScore(page) },
  'sushi-bearbeiten': {
    path: sushiPath,
    run: async ({ page }) => {
      await page.getByRole('button', { name: 'Touristen bearbeiten' }).click()
      await page.waitForTimeout(400)
      await showSushiScore(page)
    },
  },
})
review.scenes['sushi-umbenennen'] = {
  path: sushiPath,
  run: async (context) => {
    await review.scenes['sushi-bearbeiten'].run(context)
    await context.page
      .getByRole('button', { name: 'Name für Sushi-Tourist 4 bearbeiten', exact: true })
      .first()
      .click()
    await context.page.waitForTimeout(300)
  },
}

// Fortschritts-Dashboard: fünf Spieler (einer mit langem Namen) über einen Abend, ein Archiv.
const progressPath = '/apps/progress-dashboard'
const seedProgress = () => {
  const base = 'apps/progress-dashboard/sessions/default'
  const players = [
    ['person-1', 'Paul', '#7b0fff', 'beer'],
    ['person-2', 'Bengt', '#f0047f', 'wine'],
    ['person-3', 'Maximiliane von Hohenstein', '#14b8a6', 'schnaps'],
    ['person-4', 'Lennart', '#ffb020', 'beer'],
    ['person-5', 'Jo', '#2f6fed', 'funnel'],
  ].map(([id, name, color, defaultEventIcon], index) => ({
    id, name, color, defaultEventIcon, position: index + 1,
  }))
  const plan = [
    ['person-1', 'beer', 1], ['person-2', 'wine', 1], ['person-1', 'beer', 1],
    ['person-4', 'beer', 1], ['person-3', 'schnaps', 0.5], ['person-2', 'wine', 1],
    ['person-1', 'beer', 1], ['person-5', 'funnel', 1], ['person-4', 'beer', 1],
    ['person-2', 'wine', 1], ['person-3', 'schnaps', 0.5], ['person-1', 'beer', 1],
    ['person-2', 'beer', 1], ['person-4', 'beer', 1], ['person-3', 'schnaps', 0.5],
    ['person-1', 'beer', 1], ['person-2', 'wine', 1], ['person-5', 'funnel', 1],
    ['person-3', 'wine', 1], ['person-2', 'wine', 1], ['person-1', 'schnaps', 0.5],
    ['person-4', 'beer', 1], ['person-2', 'beer', 1], ['person-1', 'beer', 1],
  ]
  const start = new Date()
  start.setHours(19, 0, 0, 0)
  const byId = Object.fromEntries(players.map((player) => [player.id, player]))
  const empty = new URLSearchParams(location.search).has('review-empty')
  const events = (empty ? [] : plan).map(([playerId, icon, valueDelta], index) => {
    const date = new Date(start.getTime() + index * 9 * 60_000)
    return {
      id: `progress-preview-${index}`,
      playerId,
      playerName: byId[playerId].name,
      playerColor: byId[playerId].color,
      valueDelta,
      icon,
      createdAtClientIso: date.toISOString(),
      createdAtLabel: date.toLocaleString('de-DE'),
      position: index + 1,
    }
  })
  localStorage.setItem('bengtstoolbox.language', 'de')
  localStorage.setItem(`app-hub:collection:${base}/players`, JSON.stringify(players))
  localStorage.setItem(
    `app-hub:collection:${base}/datasets`,
    JSON.stringify([
      { id: 'dataset-current', position: 2, name: 'Datensatz', chartTitle: 'Getränke-Dashboard', unit: 'Getränke', status: 'active', createdAtClientIso: start.toISOString(), archivedAtClientIso: null, events },
      { id: 'dataset-archived', position: 1, name: 'Datensatz', chartTitle: 'Getränke-Dashboard', unit: 'Getränke', status: 'archived', createdAtClientIso: '2026-10-10T17:00:00.000Z', archivedAtClientIso: '2026-10-11T01:00:00.000Z', events: events.slice(0, 10) },
    ]),
  )
  localStorage.setItem(
    `app-hub:doc:${base}/state/default`,
    JSON.stringify({ activeDatasetId: 'dataset-current' }),
  )
}
const progressSetup = review.setup
review.setup = async (page, base) => {
  await progressSetup(page, base)
  await page.addInitScript(seedProgress)
}
const progressReady = (page) => page.locator('svg[role=group]').first().waitFor()
Object.assign(review.scenes, {
  'progress-start': { path: progressPath, run: async ({ page }) => progressReady(page) },
  'progress-scroll': {
    path: progressPath,
    run: async ({ page }) => {
      await progressReady(page)
      await page.evaluate(() => scrollTo(0, 640))
    },
  },
  // Zentraler Eintragsdialog mit Spieler Paul und halber Menge.
  'progress-eintragen': {
    path: progressPath,
    run: async ({ page }) => {
      await page.getByRole('button', { name: 'Eintragen', exact: true }).filter({ visible: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('radio', { name: 'Paul' }).click()
      await dialog.getByRole('radio', { name: '½', exact: true }).click()
      await page.waitForTimeout(300)
    },
  },
  'progress-verwalten': {
    path: progressPath,
    run: async ({ page }) => {
      const setup = page.getByRole('button', { name: /^Spieler/ }).first()
      await setup.click()
      await page.waitForTimeout(300)
      await setup.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await page.evaluate(() => scrollBy(0, -96))
    },
  },
  'progress-archiv': {
    path: progressPath,
    run: async ({ page }) => {
      await page
        .getByText('Alte Datensätze', { exact: true })
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
  'progress-leer': { path: `${progressPath}?review-empty=1` },
})

// Schweizer Turnier: Turnier über die Oberfläche anlegen, eine Runde auswerten, zweite Runde erzeugen.
const swissPath = '/apps/swiss-tournaments'
const startSwiss = async (page) => {
  await page.getByRole('button', { name: 'Neues Turnier' }).click()
  await page.getByRole('dialog', { name: 'Neues Turnier anlegen' })
    .getByRole('button', { name: 'Turnier starten' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.addStyleTag({ content: '[data-sonner-toaster] { display: none !important; }' })
}
const playSwissRound = async (page) => {
  await page.getByRole('tab', { name: 'Paarungen' }).click()
  await page.getByRole('button', { name: 'Neue Runde' }).click()
  const results = page.locator('[role="combobox"]:visible:is(:not([aria-label]), [aria-label="Ergebnis"])')
  const count = await results.count()
  for (let index = 0; index < count; index += 1) {
    await results.nth(index).click()
    await page.getByRole('option', { name: '1 - 0', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Neue Runde' }).click()
  await page.waitForTimeout(400)
}
Object.assign(review.scenes, {
  'swiss-anlegen': {
    path: swissPath,
    run: async ({ page }) => {
      await page.getByRole('button', { name: 'Neues Turnier' }).click()
      const dialog = page.getByRole('dialog', { name: 'Neues Turnier anlegen' })
      await dialog.getByRole('button', { name: /entfernen/ }).filter({ visible: true }).first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(300)
    },
  },
  'swiss-spieler': {
    path: swissPath,
    run: async ({ page }) => {
      await startSwiss(page)
      await page.getByRole('tab', { name: 'Spieler' }).click()
      await page.getByRole('button', { name: /entfernen/ }).filter({ visible: true }).first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(300)
    },
  },
  'swiss-paarungen': {
    path: swissPath,
    run: async ({ page }) => {
      await startSwiss(page)
      await playSwissRound(page)
      await page.getByRole('combobox', { name: /korrigieren/ }).first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
  // Wie oben, Maus über der ersten Ergebniskorrektur.
  'swiss-paarungen-hover': {
    path: swissPath,
    run: async ({ page }) => {
      await review.scenes['swiss-paarungen'].run({ page })
      await page.getByRole('combobox', { name: /korrigieren/ }).first().hover()
      await page.waitForTimeout(300)
    },
    keepPointer: true,
  },
  'swiss-archiv': {
    path: swissPath,
    run: async ({ page }) => {
      await startSwiss(page)
      await startSwiss(page)
      await page.getByRole('tab', { name: 'Übersicht' }).click()
      const archive = page.getByRole('button', { name: /Alte Datensätze/ })
      await archive.click()
      await archive.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await page.waitForTimeout(300)
    },
  },
})

Object.assign(review.scenes, {
  hub: { path: '/' },
  'hub-qr': {
    path: '/',
    run: async ({ page }) => {
      await page.getByRole('button', { name: 'QR-Code vergrößern' }).click()
      await page.getByRole('dialog').waitFor()
    },
  },
})

const triathlonTabs = new Set(['Rekorde', 'Planung', 'Tagebuch', 'Statistik'])
const disciplineLabels = { swim: 'Schwimmen', bike: 'Rad', run: 'Laufen' }
const sceneDisciplines = {
  rekorde: 'swim',
  'rekorde-rad': 'bike',
  'rekorde-laufen': 'run',
  'record-empty': 'run',
  leistung: 'run',
  'leistung-rad': 'bike',
  'leistung-schwimmen': 'swim',
}
for (const [name, discipline] of Object.entries(sceneDisciplines))
  review.scenes[name].discipline = discipline

// Layouts with a discipline switcher show one sport at a time.
async function focusDiscipline(page, discipline) {
  const switcher = page.locator('[data-discipline-switch]:visible')
  if (!(await switcher.count())) return
  await switcher
    .first()
    .getByRole('radio', { name: disciplineLabels[discipline], exact: true })
    .click()
  await page.waitForTimeout(400)
}

for (const scene of Object.values(review.scenes)) {
  const run = scene.run
  // Mobile icon tabs show only the active label, so tabs are opened by role.
  const tab = scene.click?.find((text) => triathlonTabs.has(text))
  if (tab) scene.click = scene.click.filter((text) => text !== tab)
  scene.run = async (context) => {
    if (tab) {
      await context.page.getByRole('tab', { name: tab, exact: true }).click()
      await context.page.waitForTimeout(review.settle)
    }
    if (scene.discipline) await focusDiscipline(context.page, scene.discipline)
    await run?.(context)
    if (!scene.keepPointer) await context.page.mouse.move(0, 0)
    await context.page.waitForTimeout(250)
  }
}

export default review
