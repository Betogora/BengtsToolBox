import { expect, test } from './browserApp'

const progressPlayersStorageKey =
  'app-hub:collection:apps/progress-dashboard/sessions/default/players'
const progressDatasetsStorageKey =
  'app-hub:collection:apps/progress-dashboard/sessions/default/datasets'
test('Fortschritts-Dashboard zeigt Diagramm, Rangliste und zentrale Eintragung responsiv', async ({
  app,
  page,
}) => {
  const players = [
    { id: 'person-1', name: 'Person 1', position: 1, color: '#facc15' },
    { id: 'person-2', name: 'Jan', position: 2, color: '#0d8e90' },
    { id: 'person-3', name: 'Niggy', position: 3, color: '#fac889' },
    { id: 'person-4', name: 'Eddy', position: 4, color: '#fd7261' },
    { id: 'person-5', name: 'Bengt', position: 5, color: '#385d73' },
  ]
  const eventValues = [
    ['person-1', 'Person 1', '#facc15', 4, '2026-08-10T18:00:00.000Z'],
    ['person-2', 'Jan', '#0d8e90', 5, '2026-08-10T18:10:00.000Z'],
    ['person-3', 'Niggy', '#fac889', 2, '2026-08-10T18:20:00.000Z'],
    ['person-4', 'Eddy', '#fd7261', 4, '2026-08-10T18:30:00.000Z'],
    ['person-5', 'Bengt', '#385d73', 3.5, '2026-08-10T18:40:00.000Z'],
    ['person-3', 'Niggy', '#fac889', 4, '2026-08-10T18:50:00.000Z'],
    ['person-2', 'Jan', '#0d8e90', 4.5, '2026-08-10T19:00:00.000Z'],
    ['person-1', 'Person 1', '#facc15', 6.5, '2026-08-10T19:10:00.000Z'],
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
  const progressList = page.getByRole('list', { name: 'Rangliste' })
  const progressItems = progressList.getByRole('listitem')
  const viewportWidth = page.viewportSize()!.width

  await expect(chart).toBeVisible()
  await expect(chart.locator('path[stroke="#facc15" i]')).toHaveCount(1)
  await expect(page.locator('[data-progress-leader]')).toContainText('Person 1')
  await expect(progressItems).toHaveCount(5)
  await expect(progressItems.nth(0)).toContainText('Person 1')
  await expect(progressItems.nth(1)).toContainText('Jan')
  await expect(progressItems.nth(2)).toContainText('Niggy')
  await expect(progressItems.nth(3)).toContainText('Eddy')
  await expect(progressItems.nth(4)).toContainText('Bengt')

  // Ab Desktop-Breite steht die Rangliste neben dem Diagramm, darunter sonst.
  const chartBounds = (await chart.boundingBox())!
  const listBounds = (await progressList.boundingBox())!
  if (viewportWidth >= 1024) expect(listBounds.x).toBeGreaterThan(chartBounds.x + chartBounds.width)
  else expect(listBounds.y).toBeGreaterThan(chartBounds.y + chartBounds.height)
  await app.expectHealthy()

  await page.getByRole('button', { name: /^Spieler/, expanded: false }).click()
  const storedColor = page.getByRole('button', { name: 'Person 1 Farbe wählen' }).locator('span')
  await expect(storedColor).toHaveCSS('background-color', 'rgb(250, 204, 21)')

  // Ein zentraler Knopf: Spieler, Getränk und eine halbe Menge im Dialog wählen.
  await page.getByRole('button', { name: 'Eintragen', exact: true }).filter({ visible: true }).click()
  const entryDialog = page.getByRole('dialog', { name: 'Eintragen' })
  await expect(entryDialog.getByRole('button', { name: 'Spieler wählen' })).toBeDisabled()
  await entryDialog.getByRole('radio', { name: 'Jan' }).click()
  await entryDialog.getByRole('radio', { name: 'Wein' }).click()
  await entryDialog.getByRole('radio', { name: '½', exact: true }).click()
  await entryDialog.getByRole('button', { name: '0,5 Wein für Jan speichern' }).click()
  await expect(entryDialog).toBeHidden()
  await expect(progressItems.nth(1)).toContainText('10')
  const lastEvent = await page.evaluate((key) => {
    const datasets = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return datasets[0]?.events.at(-1)
  }, progressDatasetsStorageKey)
  expect(lastEvent).toMatchObject({ playerId: 'person-2', icon: 'wine', valueDelta: 0.5 })

  // Das zuletzt gewählte Getränk wird beim nächsten Eintrag für Jan vorgeschlagen.
  await page.getByRole('button', { name: 'Eintragen', exact: true }).filter({ visible: true }).click()
  await entryDialog.getByRole('radio', { name: 'Jan' }).click()
  await expect(entryDialog.getByRole('radio', { name: 'Wein' })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await app.expectHealthy()

  await page.getByRole('button', { name: 'Datensatz', exact: false }).click()
  const dateInput = page.locator('input[aria-label="Datum"]:visible').first()
  const timeInput = page.locator('input[aria-label="Uhrzeit"]:visible').first()
  // Die oberste Tabellenzeile ist der zuletzt eingetragene Wein für Jan.
  const readTimestamp = () => page.evaluate(({ key, eventId }) => {
    const datasets = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return datasets[0]?.events.find((event: { id: string }) => event.id === eventId)?.createdAtClientIso
  }, { key: progressDatasetsStorageKey, eventId: lastEvent.id })
  const timestamp = await readTimestamp()

  await dateInput.fill('2026-02-29')
  await dateInput.press('Tab')
  expect(await readTimestamp()).toBe(timestamp)
  await dateInput.fill('2026-08-11')
  await dateInput.press('Tab')
  await expect(dateInput).toHaveValue('11.08.2026')
  await timeInput.fill('23:07')
  const expectedTimestamp = await page.evaluate(() =>
    new Date('2026-08-11T23:07').toISOString(),
  )
  await expect.poll(readTimestamp).toBe(expectedTimestamp)
  await page.getByRole('button', { name: 'Uhrzeit wählen: Uhrzeit' }).filter({ visible: true }).first().click()
  await expect(page.locator('[data-time-picker]')).toBeVisible()
  await page.keyboard.press('Escape')
  await app.expectHealthy()
})

test('Fortschritts-Dashboard zeigt Rangliste ohne Führung auch ohne Ereignisse', async ({
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

  const progressList = page.getByRole('list', { name: 'Rangliste' })

  await expect(page.getByText('Noch keine Ereignisse im aktuellen Datensatz.')).toBeVisible()
  await expect(progressList.getByRole('listitem')).toHaveCount(2)
  await expect(page.locator('[data-progress-leader]')).toHaveText('Führung: –')
  await app.expectHealthy()
})
